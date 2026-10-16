"use strict";

// Express serve interface e API na mesma origem. Live Server usa a API na porta 3001.
const API = ["5500", "5501"].includes(location.port)
  ? `${location.protocol}//${location.hostname}:3001/api`
  : "/api";
const $ = (seletor) => document.querySelector(seletor);
const dinheiro = (valor) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escapeHtml = (valor) => String(valor ?? "").replace(/[&<>"']/g, caractere => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere]);

const estado = {
  usuario: null,
  inscricoes: [],
  publicacoes: [],
  eventos: [],
  produtos: [],
  membros: [],
  pedidos: [],
  resumo: null,
  carrinho: lerCarrinho(),
  categoriaProduto: "",
  gestao: "produtos",
  editor: null,
  exclusao: null,
  depoisDoLogin: "mural",
  reabrirCarrinho: false,
  modoCadastro: false,
  erros: {},
  carregando: {},
  view: "inicio"
};
let toastTimer;
const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
let transicaoPagina = null;
let animacaoAlternativa = null;
let numeroNavegacao = 0;
let primeiraNavegacao = true;

// A troca de conteúdo continua funcionando em navegadores sem View Transitions.
async function transicionarPagina(atualizar, numero) {
  transicaoPagina?.skipTransition();
  animacaoAlternativa?.cancel();
  const aplicar = () => { if (numero === numeroNavegacao) atualizar(); };
  if (primeiraNavegacao || movimentoReduzido.matches) {
    primeiraNavegacao = false;
    aplicar();
    return;
  }
  if (typeof document.startViewTransition === "function") {
    const transicao = document.startViewTransition(aplicar);
    transicaoPagina = transicao;
    transicao.ready.catch(() => {});
    transicao.finished.catch(() => {}).finally(() => {
      if (transicaoPagina === transicao) transicaoPagina = null;
    });
    await transicao.updateCallbackDone;
  } else {
    aplicar();
    animacaoAlternativa = $("#conteudo").animate([
      { opacity: 0, transform: "translateY(18px)" },
      { opacity: 1, transform: "translateY(0)" }
    ], { duration: 450, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }
}

function animarItens(seletor) {
  if (movimentoReduzido.matches || document.activeElement?.matches('input[type="search"]')) return;
  document.querySelector(seletor)?.querySelectorAll(":scope > article, :scope > tr").forEach((item, indice) => {
    item.style.setProperty("--item-delay", `${Math.min(indice, 6) * 45}ms`);
    item.classList.add("item-enter");
  });
}

function lerCarrinho() {
  try {
    const dados = JSON.parse(localStorage.getItem("jg_carrinho") || "[]");
    if (!Array.isArray(dados)) return [];
    return dados.filter(item => Number.isInteger(item?.produto_id) && item.produto_id > 0 && Number.isInteger(item.quantidade) && item.quantidade > 0 && item.quantidade <= 99).slice(0, 50);
  } catch {
    return [];
  }
}

function salvarCarrinho() {
  try { localStorage.setItem("jg_carrinho", JSON.stringify(estado.carrinho)); } catch { /* Continua funcionando quando o navegador bloqueia armazenamento. */ }
  $("#cart-count").textContent = estado.carrinho.reduce((total, item) => total + item.quantidade, 0);
}

async function requisicao(rota, { method = "GET", body } = {}) {
  const controle = new AbortController();
  const timeout = setTimeout(() => controle.abort(), 15000);
  try {
    const resposta = await fetch(`${API}${rota}`, {
      method,
      credentials: "include",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controle.signal
    });
    if (!resposta.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Não foi possível acessar a API. Confira se o servidor está funcionando.");
    }
    const dados = await resposta.json();
    if (!resposta.ok) {
      const erro = new Error(dados.mensagem || "Não foi possível concluir a operação.");
      erro.status = resposta.status;
      if (resposta.status === 401 && estado.usuario) {
        estado.usuario = null;
        estado.inscricoes = [];
        atualizarConta();
      }
      throw erro;
    }
    return dados;
  } catch (erro) {
    if (erro.name === "AbortError") throw new Error("O servidor demorou a responder. Tente novamente.");
    if (erro instanceof TypeError) throw new Error("Sem conexão com o servidor. Confira se o backend está iniciado.");
    throw erro;
  } finally {
    clearTimeout(timeout);
  }
}

function avisar(mensagem, erro = false) {
  const toast = $("#toast");
  toast.textContent = mensagem;
  toast.classList.toggle("error", erro);
  toast.hidden = false;
  toast.getAnimations().forEach(animacao => animacao.cancel());
  if (!movimentoReduzido.matches) toast.animate([
    { opacity: 0, translate: "0 12px", scale: ".97" },
    { opacity: 1, translate: "0 0", scale: "1" }
  ], { duration: 300, easing: "ease-out" });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

function feedback(form, mensagem = "", sucesso = false) {
  const elemento = form.querySelector(".form-feedback");
  elemento.textContent = mensagem;
  elemento.classList.toggle("success", sucesso);
}

function carregamento() { return '<div class="empty-state is-loading" role="status"><img class="loading-sigil" src="assets/d20.svg" width="38" height="38" alt=""><strong>Preparando a mesa…</strong><p>Buscando os registros da taverna.</p></div>'; }
function vazio(titulo, descricao) { return `<div class="empty-state"><strong>${escapeHtml(titulo)}</strong><p>${escapeHtml(descricao)}</p></div>`; }
function falha(tipo) { return `<div class="empty-state"><strong>A mesa ainda não está pronta.</strong><p>${escapeHtml(estado.erros[tipo])}</p><button class="button outline small" data-action="retry" data-kind="${tipo}">Tentar novamente</button></div>`; }
function iniciais(nome) { return nome.trim().split(/\s+/).slice(0, 2).map(parte => Array.from(parte)[0]).join("").toUpperCase(); }

// DATETIME dos eventos já é o horário da taverna. TIMESTAMP vem do banco em UTC.
function dataEvento(valor) {
  const [data, hora] = valor.split(" ");
  const [ano, mes, dia] = data.split("-").map(Number);
  const utc = new Date(Date.UTC(ano, mes - 1, dia));
  return {
    dia: String(dia).padStart(2, "0"),
    mes: utc.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", ""),
    completa: `${utc.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })} · ${hora.slice(0, 5)}`,
    local: `${data}T${hora.slice(0, 5)}`,
    encerrado: new Date(`${data}T${hora}-03:00`).getTime() <= Date.now()
  };
}
function dataRegistro(valor) {
  return new Date(valor.replace(" ", "T") + "Z").toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

function atualizarConta() {
  $("#account-link").textContent = estado.usuario ? estado.usuario.nome.split(" ")[0] + " ↗" : "Entrar ↗";
  $("#account-link").href = estado.usuario ? "#perfil" : "#entrar";
  $("#account-link").setAttribute("aria-label", estado.usuario ? "Abrir meu perfil" : "Entrar na conta");
  document.querySelectorAll("[data-admin-only]").forEach(elemento => { elemento.hidden = estado.usuario?.papel !== "admin"; });
  if (estado.usuario?.papel !== "admin") {
    estado.membros = [];
    estado.pedidos = [];
    estado.resumo = null;
    $("#manage-body").replaceChildren();
    $("#admin-overview").replaceChildren();
  }
  $("#logout-button").hidden = !estado.usuario;
  $("#composer-name").textContent = estado.usuario ? `O que nos conta, ${estado.usuario.nome}?` : "Qual é a sua história?";
  $("#composer-avatar").textContent = estado.usuario ? iniciais(estado.usuario.nome) : "JG";
  $("#checkout-name").value = estado.usuario?.nome || "";
  $("#checkout-name").required = !!estado.usuario;
  $("#checkout-email").value = estado.usuario?.email || "";
  $("#checkout-button").textContent = estado.usuario ? "Registrar pedido demonstrativo →" : "Entrar para finalizar →";
  renderizarPublicacoes();
}

function precisaEntrar(destino) {
  if (estado.usuario) return false;
  estado.depoisDoLogin = destino;
  fecharDialogs();
  location.hash = "entrar";
  avisar("Entre na sua conta para continuar.");
  return true;
}

function podeGerenciar() {
  if (precisaEntrar("gestao")) return false;
  if (estado.usuario.papel === "admin") return true;
  avisar("O catálogo e a agenda são gerenciados pela equipe da taverna.", true);
  if (location.hash === "#gestao") location.hash = "perfil";
  return false;
}

function fecharDialogs() {
  document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
}

async function carregar(tipo) {
  if (estado.carregando[tipo]) return estado.carregando[tipo];
  const operacao = (async () => {
    delete estado.erros[tipo];
    try {
      estado[tipo] = await requisicao(`/${tipo}`);
      if (tipo === "publicacoes") renderizarPublicacoes();
      if (tipo === "eventos") renderizarEventos();
      if (tipo === "produtos") renderizarProdutos();
      renderizarGestao();
      return true;
    } catch (erro) {
      estado.erros[tipo] = erro.message;
      if (tipo === "publicacoes") $("#posts-list").innerHTML = falha(tipo);
      if (tipo === "eventos") $("#events-list").innerHTML = falha(tipo);
      if (tipo === "produtos") $("#products-list").innerHTML = falha(tipo);
      renderizarGestao();
      return false;
    } finally {
      delete estado.carregando[tipo];
    }
  })();
  estado.carregando[tipo] = operacao;
  return operacao;
}

async function navegar() {
  const numero = ++numeroNavegacao;
  const destino = location.hash.slice(1).split("?")[0] || "inicio";
  if (destino === "sobre") {
    await transicionarPagina(() => { if (estado.view !== "inicio") mostrarView("inicio"); }, numero);
    if (numero === numeroNavegacao) $("#sobre").scrollIntoView({ behavior: movimentoReduzido.matches ? "instant" : "smooth" });
    return;
  }
  const view = ["entrar", "cadastro"].includes(destino) ? "auth" : destino;
  if (!document.getElementById("view-" + view)) { location.hash = "inicio"; return; }
  if (view === "gestao" && !podeGerenciar()) return;
  if (["perfil", "pedidos"].includes(view) && precisaEntrar(view)) return;
  await transicionarPagina(() => {
    mostrarView(view);
    if (view === "auth") {
      estado.modoCadastro = destino === "cadastro";
      configurarAuth();
    }
    // Mantém os registros visíveis durante a atualização, evitando uma tela vazia.
    if (view === "mural") {
      if (estado.publicacoes.length) renderizarPublicacoes(); else $("#posts-list").innerHTML = carregamento();
    }
    if (view === "eventos") {
      if (estado.eventos.length) renderizarEventos(); else $("#events-list").innerHTML = carregamento();
    }
    if (view === "loja") {
      if (estado.produtos.length) renderizarProdutos(); else $("#products-list").innerHTML = carregamento();
    }
  }, numero);
  if (numero !== numeroNavegacao) return;
  if (view === "mural") await carregar("publicacoes");
  if (view === "eventos") await carregar("eventos");
  if (view === "loja") {
    if (estado.reabrirCarrinho) {
      estado.reabrirCarrinho = false;
      await abrirCarrinho();
    } else await carregar("produtos");
  }
  if (view === "gestao") {
    if (precisaEntrar("gestao")) return;
    await carregarGestao();
  }
  if (view === "pedidos") await renderizarPedidos();
  if (view === "perfil") await carregarPerfil();
}

function mostrarView(view) {
  fecharDialogs();
  estado.view = view;
  document.body.dataset.view = view;
  document.querySelectorAll(".view").forEach(secao => { secao.hidden = secao.id !== `view-${view}`; });
  document.querySelectorAll(".nav a").forEach(link => {
    const ativo = link.dataset.view === view;
    link.classList.toggle("active", ativo);
    if (ativo) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "instant" });
  if (view !== "inicio") $("#conteudo").focus({ preventScroll: true });
}

function configurarAuth() {
  const cadastro = estado.modoCadastro;
  $("#auth-name-label").hidden = !cadastro;
  $("#auth-name").required = cadastro;
  $("#auth-password").autocomplete = cadastro ? "new-password" : "current-password";
  $("#auth-title").textContent = cadastro ? "Toda aventura tem um início." : "Bem-vindo de volta.";
  $("#auth-eyebrow").textContent = cadastro ? "UM NOVO AVENTUREIRO À MESA" : "SUA HISTÓRIA CONTINUA";
  $("#auth-description").textContent = cadastro ? "Crie sua conta e encontre sua companhia." : "A companhia está esperando por você.";
  $("#auth-submit").textContent = cadastro ? "Criar minha conta →" : "Entrar na taverna →";
  $("#auth-switch").innerHTML = cadastro ? 'Já faz parte da companhia? <a href="#entrar">Entre na sua conta</a>' : 'Sua primeira aventura? <a href="#cadastro">Crie sua conta</a>';
  feedback($("#auth-form"));
}

function renderizarPublicacoes() {
  if (estado.erros.publicacoes) { $("#posts-list").innerHTML = falha("publicacoes"); return; }
  const busca = $("#post-search").value.toLocaleLowerCase("pt-BR");
  const publicacoes = estado.publicacoes.filter(item => `${item.autor} ${item.conteudo} ${item.categoria}`.toLocaleLowerCase("pt-BR").includes(busca));
  $("#posts-list").innerHTML = publicacoes.length ? publicacoes.map(item => {
    const podeEditar = estado.usuario && (estado.usuario.papel === "admin" || item.usuario_id === estado.usuario.id);
    return `<article class="post panel"><div class="post-heading"><span class="avatar">${escapeHtml(iniciais(item.autor))}</span><div><strong>${escapeHtml(item.autor)}</strong><time datetime="${escapeHtml(item.criado_em.replace(" ", "T") + "Z")}">${escapeHtml(dataRegistro(item.criado_em))}</time></div><span class="tag">${escapeHtml(item.categoria)}</span></div><p class="post-content">${escapeHtml(item.conteudo)}</p>${podeEditar ? `<div class="post-actions"><button data-action="edit" data-kind="publicacoes" data-id="${item.id}" aria-label="Editar publicação de ${escapeHtml(item.autor)}">Editar</button><button data-action="delete" data-kind="publicacoes" data-id="${item.id}" aria-label="Excluir publicação de ${escapeHtml(item.autor)}">Excluir</button></div>` : ""}</article>`;
  }).join("") : vazio(busca ? "Nenhuma história encontrada." : "A primeira história pode ser sua.", busca ? "Tente outros termos na busca." : "Publique uma mensagem e dê início à conversa.");
  animarItens("#posts-list");
}

function renderizarEventos() {
  if (estado.erros.eventos) { $("#events-list").innerHTML = falha("eventos"); return; }
  const busca = $("#event-search").value.toLocaleLowerCase("pt-BR");
  const categoria = $("#event-category").value;
  const eventos = estado.eventos.filter(item => (!categoria || item.categoria === categoria) && `${item.titulo} ${item.descricao} ${item.local}`.toLocaleLowerCase("pt-BR").includes(busca));
  $("#events-list").innerHTML = eventos.length ? eventos.map(item => {
    const data = dataEvento(item.data_evento);
    const inscrito = estado.inscricoes.includes(item.id);
    const lotado = item.inscritos >= item.vagas;
    const texto = inscrito ? "Cancelar minha inscrição" : data.encerrado ? "Evento encerrado" : lotado ? "Mesa completa" : "Reservar meu lugar →";
    return `<article class="event-card panel" data-category="${escapeHtml(item.categoria)}"><div class="event-top"><div class="event-date"><strong>${data.dia}</strong><span>${data.mes}</span></div><span class="tag">${escapeHtml(item.categoria)}</span></div><h3>${escapeHtml(item.titulo)}</h3><p>${escapeHtml(item.descricao)}</p><div class="event-meta"><span>◷ ${escapeHtml(data.completa)}</span><span>⌖ ${escapeHtml(item.local)}</span><span>${item.inscritos} de ${item.vagas} lugares reservados</span></div><button class="button ${inscrito ? "outline" : "primary"} small" data-action="subscribe" data-id="${item.id}" ${!inscrito && (lotado || data.encerrado) ? "disabled" : ""}>${texto}</button></article>`;
  }).join("") : vazio("Nenhuma mesa por aqui ainda.", "Experimente outra categoria ou volte para descobrir novos encontros.");
  animarItens("#events-list");
}

function ilustracao(categoria) {
  const formas = {
    "Dados": '<path d="m32 3 27 16v28L32 61 5 47V19Z"/><path d="m32 3-15 24 15 23 15-23L32 3ZM5 19l12 8-12 20m54-28-12 8 12 20M5 47l27 3 27-3M32 61V50M17 27h30"/><text x="32" y="41" text-anchor="middle" fill="currentColor" stroke="none" font-size="12" font-family="Georgia">20</text>',
    "Livros": '<path d="M7 12c10-3 18-1 25 4 7-5 15-7 25-4v39c-10-3-18-1-25 4-7-5-15-7-25-4V12ZM32 16v39M14 24l11 3m-11 7 11 3m14-10 11-3m-11 13 11-3"/>',
    "Acessórios": '<rect x="14" y="5" width="38" height="54" rx="3"/><path d="M21 5v54M11 15h6m-6 10h6m-6 10h6m-6 10h6m22-27 5 8-5 8-5-8 5-8ZM30 45h14"/>',
    "Card games": '<path d="m15 51-8-39 31-6 7 17"/><rect x="23" y="17" width="33" height="42" rx="3"/><path d="m39 27 8 11-8 11-8-11 8-11Z"/>'
  };
  return `<svg class="illustration" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">${formas[categoria] || formas.Dados}</svg>`;
}

function renderizarProdutos() {
  if (estado.erros.produtos) { $("#products-list").innerHTML = falha("produtos"); return; }
  const busca = $("#product-search").value.toLocaleLowerCase("pt-BR");
  const produtos = estado.produtos.filter(item => (!estado.categoriaProduto || item.categoria === estado.categoriaProduto) && `${item.nome} ${item.descricao}`.toLocaleLowerCase("pt-BR").includes(busca));
  $("#products-list").innerHTML = produtos.length ? produtos.map(item => `<article class="product-card panel"><div class="product-art" data-category="${escapeHtml(item.categoria)}">${ilustracao(item.categoria)}<span class="art-note">ILUSTRAÇÃO</span></div><div class="product-info"><p class="eyebrow">${escapeHtml(item.categoria)}</p><h3>${escapeHtml(item.nome)}</h3><p>${escapeHtml(item.descricao)}</p><div class="product-price"><strong>${dinheiro(item.preco)}</strong><span>${item.estoque} em estoque</span></div><button class="button outline small" data-action="add-cart" data-id="${item.id}" ${item.estoque <= 0 ? "disabled" : ""}>${item.estoque <= 0 ? "Esgotado" : "Adicionar ao inventário +"}</button></div></article>`).join("") : vazio("Este tesouro ainda não apareceu.", "Escolha outra categoria ou tente buscar pelo nome.");
  animarItens("#products-list");
}

function abrirEditor(tipo, id = null) {
  if (precisaEntrar(tipo === "publicacoes" ? "mural" : "gestao")) return;
  if (tipo !== "publicacoes" && !podeGerenciar()) return;
  const item = id ? estado[tipo].find(registro => registro.id === id) : {};
  if (!item) { avisar("Registro não encontrado. Atualize a página.", true); return; }
  estado.editor = { tipo, id };
  const nomes = { produtos: "produto", eventos: "evento", publicacoes: "publicação", membros: "pessoa", pedidos: "pedido" };
  $("#editor-title").textContent = `${id ? "Editar" : ["publicacoes", "membros"].includes(tipo) ? "Nova" : "Novo"} ${nomes[tipo]}`;
  const campo = (rotulo, nome, valor, atributos = "") => `<label>${rotulo}<input name="${nome}" value="${escapeHtml(valor ?? "")}" ${atributos} required></label>`;
  const selecao = (opcoes) => `<label>Categoria<select name="categoria">${opcoes.map(opcao => `<option ${item.categoria === opcao ? "selected" : ""}>${opcao}</option>`).join("")}</select></label>`;
  const descricao = `<label>Descrição<textarea name="descricao" rows="4" minlength="10" maxlength="1200" required>${escapeHtml(item.descricao)}</textarea></label>`;
  const camposAdmin = camposEditorAdmin(tipo, item, id);
  if (camposAdmin) {
    $("#editor-fields").innerHTML = camposAdmin;
  } else if (tipo === "produtos") {
    $("#editor-fields").innerHTML = campo("Nome do produto", "nome", item.nome, 'minlength="3" maxlength="120"') + descricao + selecao(["Dados", "Livros", "Acessórios", "Card games"]) + `<div class="form-row">${campo("Preço (R$)", "preco", item.preco, 'type="number" min="0.01" max="999999.99" step="0.01"')}${campo("Estoque", "estoque", item.estoque ?? "0", 'type="number" min="0" max="99999" step="1"')}</div>`;
  } else if (tipo === "eventos") {
    $("#editor-fields").innerHTML = campo("Título do evento", "titulo", item.titulo, 'minlength="3" maxlength="120"') + descricao + selecao(["RPG", "Board game", "Card game"]) + campo("Local", "local", item.local || "Taverna Joelho de Grilo", 'minlength="3" maxlength="150"') + `<div class="form-row">${campo("Data e hora (Santa Cruz do Sul)", "data_evento", item.data_evento ? dataEvento(item.data_evento).local : "", 'type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59"')}${campo("Número de vagas", "vagas", item.vagas || "6", 'type="number" min="1" max="999" step="1"')}</div>`;
  } else {
    $("#editor-fields").innerHTML = `<label>Sua publicação<textarea name="conteudo" rows="6" minlength="3" maxlength="1500" required>${escapeHtml(item.conteudo)}</textarea></label>` + selecao(["Conversa", "Procuro mesa", "Relato de aventura"]);
  }
  feedback($("#editor-form"));
  $("#editor-dialog").showModal();
}

function confirmarExclusao(tipo, id) {
  if (precisaEntrar(tipo === "publicacoes" ? "mural" : "gestao")) return;
  if (tipo !== "publicacoes" && !podeGerenciar()) return;
  const item = estado[tipo].find(registro => registro.id === id);
  if (!item) return;
  estado.exclusao = { tipo, id };
  $("#confirm-text").textContent = tipo === "eventos" ? `Excluir “${item.titulo}”? Suas inscrições também serão removidas. Esta ação não pode ser desfeita.` : tipo === "produtos" ? `Excluir “${item.nome}” do catálogo? O histórico dos pedidos será preservado.` : "Excluir esta publicação do mural? Esta ação não pode ser desfeita.";
  if (tipo === "membros") $("#confirm-text").textContent = `Remover “${item.nome}” da comunidade? Suas publicações, inscrições e sessões serão removidas. O histórico de pedidos será preservado.`;
  if (tipo === "pedidos") $("#confirm-text").textContent = `Excluir o pedido #${item.id}? Os itens disponíveis serão devolvidos ao estoque caso o pedido ainda não tenha sido cancelado.`;
  feedback($("#confirm-dialog"));
  $("#confirm-dialog").showModal();
}

function adicionarAoCarrinho(id) {
  const produto = estado.produtos.find(item => item.id === id);
  if (!produto) return;
  const existente = estado.carrinho.find(item => item.produto_id === id);
  const quantidade = existente?.quantidade || 0;
  if (quantidade >= produto.estoque || quantidade >= 99) { avisar("Você já adicionou a quantidade disponível.", true); return; }
  if (existente) existente.quantidade++; else estado.carrinho.push({ produto_id: id, quantidade: 1 });
  salvarCarrinho();
  avisar(`${produto.nome} adicionado ao inventário.`);
}

function renderizarCarrinho() {
  let totalCentavos = 0;
  let invalido = false;
  $("#cart-items").innerHTML = estado.carrinho.length ? estado.carrinho.map(item => {
    const produto = estado.produtos.find(p => p.id === item.produto_id);
    const indisponivel = !produto || item.quantidade > produto.estoque;
    invalido ||= indisponivel;
    if (produto) totalCentavos += Math.round(produto.preco * 100) * item.quantidade;
    return `<div class="cart-item"><img src="assets/d20.svg" alt=""><div class="cart-item-info"><strong>${escapeHtml(produto?.nome || "Produto removido do catálogo")}</strong><p>${indisponivel ? "Quantidade indisponível. Ajuste ou remova o item." : dinheiro(produto.preco)}</p><div class="quantity"><button type="button" data-action="quantity" data-id="${item.produto_id}" data-change="-1" aria-label="Diminuir quantidade de ${escapeHtml(produto?.nome || "produto")}">−</button><span>${item.quantidade}</span><button type="button" data-action="quantity" data-id="${item.produto_id}" data-change="1" aria-label="Aumentar quantidade de ${escapeHtml(produto?.nome || "produto")}" ${!produto || item.quantidade >= Math.min(produto.estoque, 99) ? "disabled" : ""}>+</button></div></div><button class="cart-remove" data-action="remove-cart" data-id="${item.produto_id}">Remover</button></div>`;
  }).join("") : vazio("Seu inventário está vazio.", "Explore a loja para encontrar seu próximo tesouro.");
  $("#cart-total").textContent = dinheiro(totalCentavos / 100);
  $("#checkout-button").disabled = !estado.carrinho.length || invalido || !!estado.erros.produtos;
}

async function abrirCarrinho() {
  feedback($("#checkout-form"));
  $("#cart-dialog").showModal();
  $("#cart-items").innerHTML = carregamento();
  $("#checkout-button").disabled = true;
  const sucesso = await carregar("produtos");
  if (!sucesso) {
    $("#cart-items").innerHTML = falha("produtos");
    return;
  }
  renderizarCarrinho();
}

async function renderizarPedidos() {
  if (precisaEntrar("pedidos")) return;
  $("#orders-list").innerHTML = carregamento();
  try {
    const pedidos = await requisicao("/pedidos");
    $("#orders-list").innerHTML = pedidos.length ? pedidos.map(pedido => `<article class="order-card panel"><div class="order-heading"><div><h2>Pedido #${pedido.id}</h2><p>${escapeHtml(dataRegistro(pedido.criado_em))}</p></div><span class="tag">${escapeHtml(situacoesPedido[pedido.status] || "Recebido")} · DEMONSTRATIVO</span></div><ul>${pedido.itens.map(item => `<li><span>${item.quantidade} × ${escapeHtml(item.nome_produto)}</span><span>${dinheiro(Math.round(item.preco_unitario * 100) * item.quantidade / 100)}</span></li>`).join("")}</ul><div class="order-total">Total ${dinheiro(pedido.total)}</div></article>`).join("") : vazio("Nenhum tesouro por aqui ainda.", "Os seus pedidos demonstrativos aparecerão aqui.");
    animarItens("#orders-list");
  } catch (erro) {
    $("#orders-list").innerHTML = vazio("Não foi possível consultar seus pedidos.", erro.message);
  }
}

async function carregarPerfil({ preencher = true } = {}) {
  const mensagem = $("#profile-feedback");
  mensagem.textContent = "Carregando sua ficha…";
  if (preencher) $("#profile-content").hidden = true;
  try {
    const dados = await requisicao("/auth/perfil");
    // Descarta uma resposta antiga se a pessoa sair da conta durante a consulta.
    if (estado.usuario?.id !== dados.usuario.id) return;
    estado.usuario = dados.usuario;
    atualizarConta();
    $("#profile-avatar").textContent = iniciais(dados.usuario.nome);
    $("#profile-name").textContent = dados.usuario.nome;
    $("#profile-role").textContent = dados.usuario.papel === "admin" ? "EQUIPE DA TAVERNA" : "MEMBRO DA TAVERNA";
    $("#profile-bio").textContent = dados.usuario.bio || "Sua história ainda está sendo escrita. Conte um pouco de você ao lado.";
    $("#profile-system").textContent = dados.usuario.sistema_preferido;
    $("#profile-posts").textContent = dados.totais.publicacoes;
    $("#profile-signups").textContent = dados.totais.inscricoes;
    $("#profile-orders").textContent = dados.totais.pedidos;
    if (preencher) {
      $("#profile-edit-name").value = dados.usuario.nome;
      $("#profile-edit-email").value = dados.usuario.email;
      $("#profile-edit-bio").value = dados.usuario.bio;
      $("#profile-edit-system").value = dados.usuario.sistema_preferido;
      atualizarContadorBio();
      feedback($("#profile-form"));
    }
    estado.inscricoes = dados.eventos.map(evento => evento.id);
    $("#profile-events").innerHTML = dados.eventos.length ? dados.eventos.map(evento => {
      const data = dataEvento(evento.data_evento);
      return `<article class="profile-event panel"><div class="event-date"><strong>${data.dia}</strong><span>${data.mes}</span></div><div class="profile-event-info"><span class="tag">${escapeHtml(evento.categoria)}</span><h3>${escapeHtml(evento.titulo)}</h3><p>${escapeHtml(data.completa)} · ${escapeHtml(evento.local)}</p></div><button class="button outline small" data-action="subscribe" data-id="${evento.id}">Cancelar inscrição</button></article>`;
    }).join("") : vazio("Sua próxima mesa está na agenda.", "Quando você se inscrever em um evento, ele aparecerá aqui.");
    animarItens("#profile-events");
    $("#profile-content").hidden = false;
    mensagem.textContent = "";
  } catch (erro) {
    mensagem.textContent = erro.message;
    if (preencher) $("#profile-content").hidden = true;
  }
}

function atualizarContadorBio() {
  $("#profile-bio-count").textContent = `${$("#profile-edit-bio").value.length} / 300`;
}

// Delegação mantém os botões funcionando mesmo depois que as listas são renderizadas.
document.addEventListener("click", async (event) => {
  const close = event.target.closest("[data-close]");
  if (close) { $("#" + close.dataset.close).close(); $("#conteudo").focus({ preventScroll: true }); }
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const { action, kind } = button.dataset;
  const id = Number(button.dataset.id);
  if (action === "manage") {
    estado.gestao = kind;
    $("#manage-search").value = "";
    if (!podeGerenciar()) return;
    if (location.hash === "#gestao") await carregarGestao(); else location.hash = "gestao";
    renderizarGestao();
  }
  if (action === "edit") abrirEditor(kind, id);
  if (action === "delete") confirmarExclusao(kind, id);
  if (action === "add-cart") adicionarAoCarrinho(id);
  if (action === "remove-cart") {
    estado.carrinho = estado.carrinho.filter(item => item.produto_id !== id);
    salvarCarrinho(); renderizarCarrinho();
  }
  if (action === "quantity") {
    const item = estado.carrinho.find(produto => produto.produto_id === id);
    if (!item) return;
    item.quantidade += Number(button.dataset.change);
    estado.carrinho = estado.carrinho.filter(produto => produto.quantidade > 0);
    salvarCarrinho(); renderizarCarrinho();
  }
  if (action === "retry") {
    await carregar(kind);
    if ($("#cart-dialog").open) {
      if (estado.erros.produtos) $("#cart-items").innerHTML = falha("produtos"); else renderizarCarrinho();
    }
  }
  if (action === "subscribe") {
    if (precisaEntrar("eventos")) return;
    button.disabled = true;
    const inscrito = estado.inscricoes.includes(id);
    try {
      const dados = await requisicao(`/eventos/${id}/inscricoes`, { method: inscrito ? "DELETE" : "POST", body: {} });
      estado.inscricoes = inscrito ? estado.inscricoes.filter(evento => evento !== id) : [...estado.inscricoes, id];
      avisar(dados.mensagem);
    } catch (erro) { avisar(erro.message, true); }
    await carregar("eventos");
    if (estado.view === "perfil") await carregarPerfil({ preencher: false });
  }
});

$("#profile-edit-bio").addEventListener("input", atualizarContadorBio);
$("#profile-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (precisaEntrar("perfil")) return;
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  feedback(form);
  try {
    const dados = await requisicao("/auth/perfil", { method: "PUT", body: Object.fromEntries(new FormData(form)) });
    estado.usuario = dados.usuario;
    atualizarConta();
    await carregarPerfil({ preencher: false });
    feedback(form, dados.mensagem, true);
    avisar(dados.mensagem);
  } catch (erro) { feedback(form, erro.message); }
  finally { button.disabled = false; }
});

$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true; feedback(form);
  try {
    const body = Object.fromEntries(new FormData(form));
    const dados = await requisicao(estado.modoCadastro ? "/auth/cadastro" : "/auth/login", { method: "POST", body });
    estado.usuario = dados.usuario;
    const conta = await requisicao("/auth/me");
    estado.inscricoes = conta.inscricoes;
    atualizarConta();
    form.reset();
    $("#auth-password").type = "password";
    avisar(dados.mensagem);
    if (estado.depoisDoLogin === "carrinho") {
      estado.depoisDoLogin = "mural";
      estado.reabrirCarrinho = true;
      location.hash = "loja";
    } else {
      if (estado.usuario.papel === "admin" && estado.depoisDoLogin === "mural") {
        estado.gestao = "resumo";
        location.hash = "gestao";
      } else location.hash = estado.depoisDoLogin;
      estado.depoisDoLogin = "mural";
    }
  } catch (erro) { feedback(form, erro.message); }
  finally { button.disabled = false; }
});

$("#show-password").addEventListener("change", event => { $("#auth-password").type = event.target.checked ? "text" : "password"; });
$("#logout-button").addEventListener("click", async () => {
  const button = $("#logout-button");
  button.disabled = true;
  try {
    const dados = await requisicao("/auth/logout", { method: "POST", body: {} });
    estado.usuario = null; estado.inscricoes = []; atualizarConta();
    location.hash = "inicio"; avisar(dados.mensagem);
  } catch (erro) { avisar(erro.message, true); }
  finally { button.disabled = false; }
});

$("#post-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (precisaEntrar("mural")) return;
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true; feedback(form);
  try {
    const dados = await requisicao("/publicacoes", { method: "POST", body: Object.fromEntries(new FormData(form)) });
    form.reset(); avisar(dados.mensagem); await carregar("publicacoes");
  } catch (erro) { feedback(form, erro.message); }
  finally { button.disabled = false; }
});

$("#editor-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  const { tipo, id } = estado.editor;
  button.disabled = true; feedback(form);
  try {
    const body = Object.fromEntries(new FormData(form));
    const dados = await requisicao(`${rotaRecurso(tipo)}${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body });
    $("#editor-dialog").close(); $("#conteudo").focus({ preventScroll: true }); avisar(dados.mensagem); await aposAlteracaoAdmin(tipo);
  } catch (erro) { feedback(form, erro.message); }
  finally { button.disabled = false; }
});

$("#confirm-delete").addEventListener("click", async () => {
  const { tipo, id } = estado.exclusao;
  const button = $("#confirm-delete");
  button.disabled = true; feedback($("#confirm-dialog"));
  try {
    const dados = await requisicao(`${rotaRecurso(tipo)}/${id}`, { method: "DELETE" });
    $("#confirm-dialog").close(); $("#conteudo").focus({ preventScroll: true }); avisar(dados.mensagem); await aposAlteracaoAdmin(tipo);
  } catch (erro) { feedback($("#confirm-dialog"), erro.message); }
  finally { button.disabled = false; }
});

$("#checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (precisaEntrar("carrinho")) return;
  const form = event.currentTarget;
  const button = $("#checkout-button");
  button.disabled = true; feedback(form);
  let comprado = false;
  try {
    const body = { nome: $("#checkout-name").value, itens: estado.carrinho.map(item => ({ ...item })) };
    const dados = await requisicao("/pedidos", { method: "POST", body });
    estado.carrinho = []; salvarCarrinho(); comprado = true;
    feedback(form, `Pedido #${dados.id} registrado: ${dinheiro(dados.total)}. Nenhuma cobrança foi realizada.`, true);
    avisar("Pedido demonstrativo registrado!");
  } catch (erro) { feedback(form, erro.message); }
  finally {
    if (await carregar("produtos")) renderizarCarrinho();
    else button.disabled = true;
    if (comprado) $("#cart-orders-link").focus();
  }
});

$("#new-record").addEventListener("click", () => abrirEditor(estado.gestao === "resumo" ? "produtos" : estado.gestao));
$("#open-cart").addEventListener("click", abrirCarrinho);
$("#cart-orders-link").addEventListener("click", () => {
  fecharDialogs();
  if (location.hash === "#pedidos") renderizarPedidos();
});
$("#post-search").addEventListener("input", renderizarPublicacoes);
$("#event-search").addEventListener("input", renderizarEventos);
$("#event-category").addEventListener("change", renderizarEventos);
$("#product-search").addEventListener("input", renderizarProdutos);
$("#manage-search").addEventListener("input", renderizarGestao);
$("#product-filters").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  estado.categoriaProduto = button.dataset.category;
  $("#product-filters").querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
  renderizarProdutos();
});
document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("click", event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));
window.addEventListener("hashchange", navegar);
movimentoReduzido.addEventListener("change", event => {
  if (event.matches) {
    transicaoPagina?.skipTransition();
    animacaoAlternativa?.cancel();
  }
});

// Revela a apresentação conforme ela entra na tela, sem esconder conteúdo de leitores de tela.
if ("IntersectionObserver" in window && !movimentoReduzido.matches) {
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("is-revealed");
      observador.unobserve(entrada.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".about > div, .explore-link").forEach((item, indice) => {
    item.classList.add("scroll-reveal");
    item.style.setProperty("--reveal-delay", `${indice % 3 * 80}ms`);
    observador.observe(item);
  });
}

// Partículas leves, sem bibliotecas externas; CSS respeita prefers-reduced-motion.
document.querySelectorAll(".particles").forEach(container => {
  for (let i = 0; i < 18; i++) {
    const particle = document.createElement("i");
    particle.className = "particle";
    particle.style.left = `${12 + Math.random() * 78}%`;
    particle.style.top = `${30 + Math.random() * 65}%`;
    particle.style.animationDelay = `${Math.random() * -12}s`;
    particle.style.animationDuration = `${10 + Math.random() * 10}s`;
    container.append(particle);
  }
});

iniciarAdmin();
(async function iniciar() {
  salvarCarrinho();
  requisicao("/comunidade").then(dados => { estado.comunidade = dados; aplicarComunidade(dados); }).catch(() => {});
  try {
    const conta = await requisicao("/auth/me");
    estado.usuario = conta.usuario;
    estado.inscricoes = conta.inscricoes;
  } catch (erro) { avisar(erro.message, true); }
  atualizarConta();
  await navegar();
})();
