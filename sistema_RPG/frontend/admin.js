"use strict";

// Este arquivo é carregado antes de script.js; os controles são ligados em iniciarAdmin().
const secoesAdmin = {
  resumo: ["Visão geral", "O PULSO DA COMUNIDADE"],
  produtos: ["Produtos & estoque", "TESOUROS PARA A PRÓXIMA AVENTURA"],
  eventos: ["Agenda de encontros", "PREPARE A PRÓXIMA MESA"],
  membros: ["Pessoas & equipe", "QUEM FAZ A TAVERNA ACONTECER"],
  publicacoes: ["Mural da comunidade", "CUIDE DAS CONVERSAS"],
  pedidos: ["Pedidos da loja", "DO INVENTÁRIO PARA A AVENTURA"],
  comunidade: ["A comunidade", "SUA HISTÓRIA, DO SEU JEITO"]
};
const situacoesPedido = { demonstrativo: "Recebido", preparando: "Preparando", concluido: "Concluído", cancelado: "Cancelado" };

function rotaRecurso(tipo) {
  return ["membros", "pedidos"].includes(tipo) ? `/admin/${tipo}` : `/${tipo}`;
}

async function carregarGestao() {
  const tipo = estado.gestao;
  $("#manage-feedback").textContent = "";
  $("#admin-workspace").setAttribute("aria-busy", "true");
  renderizarGestao();
  try {
    if (["produtos", "eventos", "publicacoes"].includes(tipo)) await carregar(tipo);
    else if (tipo === "resumo") estado.resumo = await requisicao("/admin/resumo");
    else if (tipo === "comunidade") {
      estado.comunidade = await requisicao("/comunidade");
      const form = $("#community-form");
      for (const [nome, valor] of Object.entries(estado.comunidade)) if (form.elements[nome]) form.elements[nome].value = valor;
      feedback(form);
    } else estado[tipo] = await requisicao(rotaRecurso(tipo));
    renderizarGestao();
    if (estado.gestao === tipo && !movimentoReduzido.matches) $("#admin-workspace").animate([{ opacity: .4, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 320, easing: "ease-out" });
  } catch (erro) {
    if (estado.gestao === tipo) $("#manage-feedback").textContent = erro.message;
  } finally { $("#admin-workspace").setAttribute("aria-busy", "false"); }
}

function renderizarGestao() {
  const tipo = estado.gestao;
  const secao = secoesAdmin[tipo] || secoesAdmin.resumo;
  $("#admin-section-title").textContent = secao[0];
  $("#admin-section-eyebrow").textContent = secao[1];
  document.querySelectorAll(".admin-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.kind === tipo);
    button.setAttribute("aria-pressed", String(button.dataset.kind === tipo));
  });
  $("#admin-overview").hidden = tipo !== "resumo";
  $("#community-form").hidden = tipo !== "comunidade";
  $("#admin-table-area").hidden = ["resumo", "comunidade"].includes(tipo);
  $("#new-record").hidden = ["pedidos", "comunidade"].includes(tipo);
  $("#new-record").textContent = ({ produtos: "+ Novo produto", eventos: "+ Novo evento", membros: "+ Adicionar pessoa", publicacoes: "+ Nova publicação" })[tipo] || "+ Novo produto";
  if (tipo === "resumo") { renderizarResumo(); return; }
  if (tipo === "comunidade") return;
  const busca = $("#manage-search").value.toLocaleLowerCase("pt-BR");
  const itens = (estado[tipo] || []).filter(item => Object.values(item).filter(valor => typeof valor !== "object").join(" ").toLocaleLowerCase("pt-BR").includes(busca));
  const colunas = {
    produtos: ["ID", "PRODUTO", "CATEGORIA", "PREÇO / ESTOQUE", "AÇÕES"],
    eventos: ["ID", "EVENTO", "CATEGORIA", "DATA / VAGAS", "AÇÕES"],
    membros: ["PESSOA", "E-MAIL", "ACESSO", "AÇÕES"],
    publicacoes: ["AUTOR", "PUBLICAÇÃO", "CATEGORIA", "AÇÕES"],
    pedidos: ["PEDIDO", "COMPRADOR", "SITUAÇÃO", "TOTAL", "AÇÕES"]
  }[tipo];
  $("#manage-head").innerHTML = `<tr>${colunas.map(coluna => `<th scope="col">${coluna}</th>`).join("")}</tr>`;
  const acoes = item => `<div class="table-actions"><button data-action="edit" data-kind="${tipo}" data-id="${item.id}">Editar</button>${tipo === "eventos" ? `<button data-action="attendees" data-id="${item.id}">Inscrições</button>` : ""}${tipo === "membros" ? `<button data-action="role" data-id="${item.id}">${item.papel === "admin" ? "Remover acesso" : "Tornar admin"}</button>` : ""}<button data-action="delete" data-kind="${tipo}" data-id="${item.id}">Excluir</button></div>`;
  $("#manage-body").innerHTML = itens.length ? itens.map(item => {
    let celulas;
    if (tipo === "membros") celulas = `<td><div class="member-cell"><span class="avatar">${escapeHtml(iniciais(item.nome))}</span><div><strong>${escapeHtml(item.nome)}</strong><small>#${item.id}</small></div></div></td><td>${escapeHtml(item.email)}</td><td><span class="status-tag ${item.papel}">${item.papel === "admin" ? "Administrador" : "Membro"}</span></td>`;
    else if (tipo === "publicacoes") celulas = `<td><strong>${escapeHtml(item.autor)}</strong></td><td><div class="admin-excerpt">${escapeHtml(item.conteudo)}</div></td><td><span class="tag">${escapeHtml(item.categoria)}</span></td>`;
    else if (tipo === "pedidos") celulas = `<td><strong>#${item.id}</strong><small>${escapeHtml(dataRegistro(item.criado_em))}</small></td><td><strong>${escapeHtml(item.nome)}</strong><small>${escapeHtml(item.email)}</small></td><td><span class="status-tag ${item.status}">${situacoesPedido[item.status] || "Demonstrativo"}</span><small>Sem cobrança real</small></td><td>${dinheiro(item.total)}</td>`;
    else celulas = `<td>#${item.id}</td><td><strong>${escapeHtml(item.nome || item.titulo)}</strong></td><td><span class="tag">${escapeHtml(item.categoria)}</span></td><td>${tipo === "produtos" ? `${dinheiro(item.preco)}<small>${item.estoque} unidades</small>` : `${escapeHtml(dataEvento(item.data_evento).completa)}<small>${item.inscritos} / ${item.vagas} inscritos</small>`}</td>`;
    return `<tr>${celulas}<td>${acoes(item)}</td></tr>`;
  }).join("") : `<tr><td colspan="${colunas.length}"><div class="admin-table-empty">Nenhum registro encontrado. Uma nova história pode começar aqui.</div></td></tr>`;
  if (estado.erros[tipo]) $("#manage-feedback").textContent = estado.erros[tipo];
}

function renderizarResumo() {
  const dados = estado.resumo;
  if (!dados) { $("#admin-overview").innerHTML = carregamento(); return; }
  const total = dados.totais;
  const cards = [
    ["♙", "Pessoas na comunidade", total.membros, `${total.administradores} na equipe`, "membros"],
    ["◇", "Produtos no catálogo", total.produtos, `${total.estoque_baixo} com estoque baixo`, "produtos"],
    ["◷", "Eventos cadastrados", total.eventos, "Prepare os próximos encontros", "eventos"],
    ["▤", "Pedidos recebidos", total.pedidos, "Compras demonstrativas", "pedidos"]
  ];
  $("#admin-overview").innerHTML = `<div class="admin-metrics">${cards.map(([icone, titulo, valor, detalhe, tipo]) => `<button class="metric-card panel" data-action="manage" data-kind="${tipo}"><span class="metric-icon" aria-hidden="true">${icone}</span><span>${titulo}</span><strong>${valor}</strong><small>${detalhe} <b aria-hidden="true">↗</b></small></button>`).join("")}</div><div class="admin-welcome panel"><div><p class="eyebrow">UMA BOA AVENTURA COMEÇA NOS DETALHES</p><h3>O próximo encontro<br>começa com você.</h3><p>Cuide da agenda, equipe a loja e receba novas pessoas na comunidade.</p><div><button class="button primary small" data-action="quick-create" data-kind="eventos">+ Criar evento</button><button class="button outline small" data-action="manage" data-kind="membros">Cuidar da equipe ↗</button></div></div><img src="assets/d20.svg" width="150" height="150" alt=""></div><div class="admin-bottom-grid"><section class="panel admin-feed"><div class="admin-feed-heading"><h3>Últimos pedidos</h3><button class="text-button" data-action="manage" data-kind="pedidos">Ver todos ↗</button></div>${dados.recentes.length ? dados.recentes.map(pedido => `<div class="admin-feed-row"><div><strong>Pedido #${pedido.id}</strong><span>${escapeHtml(pedido.nome)}</span></div><div><strong>${dinheiro(pedido.total)}</strong><span>${situacoesPedido[pedido.status] || "Demonstrativo"}</span></div></div>`).join("") : '<p class="admin-empty-copy">Os próximos pedidos aparecerão aqui.</p>'}<small>Volume demonstrativo: ${dinheiro(total.total_demonstrativo)} · sem cobrança.</small></section><section class="panel admin-feed"><div class="admin-feed-heading"><h3>De olho no estoque</h3><button class="text-button" data-action="manage" data-kind="produtos">Abrir loja ↗</button></div>${dados.estoque.length ? dados.estoque.map(produto => `<div class="admin-feed-row"><strong>${escapeHtml(produto.nome)}</strong><span class="status-tag ${produto.estoque === 0 ? "cancelado" : "preparando"}">${produto.estoque} un.</span></div>`).join("") : '<div class="admin-stock-ok"><span aria-hidden="true">✧</span><p>Os tesouros estão em dia.</p><small>Nenhum produto com estoque baixo.</small></div>'}</section></div>`;
}

function camposEditorAdmin(tipo, item, id) {
  const campo = (rotulo, nome, valor, atributos = "") => `<label>${rotulo}<input name="${nome}" value="${escapeHtml(valor ?? "")}" ${atributos} required></label>`;
  if (tipo === "membros") return campo("Nome", "nome", item.nome, 'minlength="2" maxlength="80"') + campo("E-mail", "email", item.email, 'type="email" maxlength="150"') + `<div class="form-row"><label>Permissão<select name="papel"><option value="membro">Membro</option><option value="admin" ${item.papel === "admin" ? "selected" : ""}>Administrador</option></select></label><label>Sistema favorito<select name="sistema_preferido">${["Estou começando", "Dungeons & Dragons", "Tormenta20", "Pathfinder", "Ordem Paranormal", "Outros sistemas"].map(sistema => `<option ${item.sistema_preferido === sistema ? "selected" : ""}>${escapeHtml(sistema)}</option>`).join("")}</select></label></div><label>Apresentação<textarea name="bio" maxlength="300" rows="3">${escapeHtml(item.bio)}</textarea></label><label>${id ? "Nova senha (opcional)" : "Senha inicial"}<input name="senha" type="password" autocomplete="new-password" minlength="8" maxlength="128" ${id ? 'placeholder="Deixe em branco para manter a senha"' : "required"}></label><p class="demo-note">Administradores podem gerenciar a taverna e a equipe. Ao definir uma nova senha, as sessões dessa pessoa são encerradas.</p>`;
  if (tipo === "pedidos") return campo("Nome do comprador", "nome", item.nome, 'minlength="2" maxlength="80"') + campo("E-mail", "email", item.email, 'type="email" maxlength="150"') + `<label>Situação<select name="status">${Object.entries(situacoesPedido).map(([valor, nome]) => `<option value="${valor}" ${item.status === valor ? "selected" : ""}>${nome}</option>`).join("")}</select></label><div class="admin-order-items">${item.itens.map(linha => `<div><span>${linha.quantidade} × ${escapeHtml(linha.nome_produto)}</span><strong>${dinheiro(linha.preco_unitario * linha.quantidade)}</strong></div>`).join("")}<div><strong>Total demonstrativo</strong><strong>${dinheiro(item.total)}</strong></div></div><p class="demo-note">Cancelar devolve os itens ao estoque uma única vez. Nenhuma cobrança é realizada.</p>`;
  return null;
}

async function atualizarSessaoAdmin() {
  const conta = await requisicao("/auth/me");
  estado.usuario = conta.usuario;
  estado.inscricoes = conta.inscricoes;
  atualizarConta();
  if (!estado.usuario) location.hash = "entrar";
  else if (estado.usuario.papel !== "admin") location.hash = "perfil";
}

async function aposAlteracaoAdmin(tipo) {
  if (tipo === "membros") await atualizarSessaoAdmin();
  if (estado.view === "gestao" && estado.usuario?.papel === "admin") await carregarGestao();
  else if (["publicacoes", "eventos", "produtos"].includes(tipo)) await carregar(tipo);
}

async function abrirInscricoes(id) {
  if (!podeGerenciar()) return;
  estado.eventoInscricoes = id;
  const dialog = $("#attendees-dialog");
  if (!dialog.open) dialog.showModal();
  $("#attendees-list").innerHTML = carregamento();
  feedback($("#attendee-form"));
  try {
    const [dados, membros] = await Promise.all([requisicao(`/admin/eventos/${id}/inscricoes`), requisicao("/admin/membros")]);
    $("#attendees-title").textContent = dados.evento.titulo;
    $("#attendees-list").innerHTML = dados.inscricoes.length ? dados.inscricoes.map(pessoa => `<div class="attendee-row"><span class="avatar">${escapeHtml(iniciais(pessoa.nome))}</span><div><strong>${escapeHtml(pessoa.nome)}</strong><small>${escapeHtml(pessoa.email || "Conta removida")}</small></div><button class="text-button" data-action="remove-registration" data-id="${pessoa.id}">Remover</button></div>`).join("") : '<p class="demo-note">Nenhuma inscrição neste evento ainda.</p>';
    $("#attendee-member").innerHTML = '<option value="">Selecione uma pessoa…</option>' + membros.map(pessoa => `<option value="${pessoa.id}">${escapeHtml(pessoa.nome)} · ${escapeHtml(pessoa.email)}</option>`).join("");
  } catch (erro) { $("#attendees-list").textContent = erro.message; }
}

function aplicarComunidade(dados) {
  if (!dados) return;
  $("#community-description").textContent = dados.descricao;
  $("#community-address").textContent = dados.endereco;
  $("#community-hours").textContent = dados.horario;
  $(".brand > span").firstChild.nodeValue = dados.nome.toUpperCase();
  $(".footer-brand").textContent = dados.nome.toUpperCase();
  document.title = `${dados.nome} | Sua próxima aventura`;
  $(".about > div > .eyebrow").textContent = `BEM-VINDO À ${dados.nome.toUpperCase()}`;
  $(".hero-description").replaceChildren(document.createTextNode("Dos primeiros dados às grandes histórias."), document.createElement("br"), document.createTextNode(`Encontre sua comunidade na ${dados.nome}.`));
  document.querySelectorAll('a[href*="linktr.ee"], [data-community-link]').forEach(link => {
    link.dataset.communityLink = "";
    link.href = dados.link_redes;
  });
}

function iniciarAdmin() {
  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const id = Number(button.dataset.id);
    if (button.dataset.action === "role" && podeGerenciar()) {
      abrirEditor("membros", id);
      $("#editor-form [name=papel]").value = estado.membros.find(pessoa => pessoa.id === id).papel === "admin" ? "membro" : "admin";
    }
    if (button.dataset.action === "quick-create") abrirEditor(button.dataset.kind);
    if (button.dataset.action === "attendees") await abrirInscricoes(id);
    if (button.dataset.action === "remove-registration" && podeGerenciar()) {
      button.disabled = true;
      try { await requisicao(`/admin/inscricoes/${id}`, { method: "DELETE" }); await abrirInscricoes(estado.eventoInscricoes); await carregar("eventos"); }
      catch (erro) { avisar(erro.message, true); button.disabled = false; }
    }
  });
  $("#attendee-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await requisicao(`/admin/eventos/${estado.eventoInscricoes}/inscricoes`, { method: "POST", body: Object.fromEntries(new FormData(form)) });
      await abrirInscricoes(estado.eventoInscricoes);
      await carregar("eventos");
    } catch (erro) { feedback(form, erro.message); }
    finally { button.disabled = false; }
  });
  $("#community-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const dados = await requisicao("/admin/comunidade", { method: "PUT", body: Object.fromEntries(new FormData(form)) });
      estado.comunidade = await requisicao("/comunidade");
      aplicarComunidade(estado.comunidade);
      feedback(form, dados.mensagem, true);
      avisar(dados.mensagem);
    } catch (erro) { feedback(form, erro.message); }
    finally { button.disabled = false; }
  });
}
