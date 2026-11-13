'use strict';

const $ = (id) => document.getElementById(id);
let token = null; // Somente memória: recarregar a página exige novo login.
let ocupado = false;

function mensagem(texto) {
    $('mensagem').textContent = texto;
}

function tela(id) {
    $('acesso').hidden = id === 'conta';
    for (const nome of ['login', 'cadastro', 'conta']) {
        $(nome).hidden = nome !== id;
    }
}

async function api(url, body, method = body ? 'POST' : 'GET') {
    const response = await fetch('/api' + url, {
        method,
        headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (response.status === 204) return;
    const dados = await response.json();
    if (!response.ok) {
        if (response.status === 401 && token) {
            encerrarSessao();
        }
        throw new Error(dados.mensagem || 'Não foi possível concluir.');
    }
    return dados;
}
for (const id of ['login', 'cadastro']) {
    $('abrir-' + id).onclick = () => {
        if (!ocupado) {
            tela(id);
            mensagem('');
        }
    };
}

for (const id of ['login', 'cadastro']) {
    $(id).onsubmit = async (event) => {
        event.preventDefault();
        if (ocupado) return;
        const body = Object.fromEntries(new FormData(event.currentTarget));
        if (id === 'cadastro' && body.senha !== body.confirmar) {
            mensagem('As senhas precisam ser iguais.');
            $('confirmar').focus();
            return;
        }
        delete body.confirmar;
        ocupado = true;
        document.querySelectorAll('button').forEach((b) => (b.disabled = true));
        mensagem('Aguarde…');
        try {
            const dados = await api('/auth/' + id, body);
            if (id === 'cadastro') {
                $('cadastro').reset();
                tela('login');
                $('login-email').value = body.email;
                mensagem(dados.mensagem);
                $('login-senha').focus();
            } else {
                token = dados.token;
                const { usuario } = await api('/usuarios/me');
                $('dados').textContent =
                    usuario.nome + ' | ' + usuario.email + ' | ' + usuario.perfil;
                $('admin').hidden = usuario.perfil !== 'administrador';
                $('pedidos').hidden = usuario.perfil !== 'contratante';
                $('login').reset();
                tela('conta');
                mensagem('Você está conectado.');
                if (usuario.perfil === 'contratante') await carregarPedidos();
            }
        } catch (e) {
            mensagem(
                e instanceof TypeError
                    ? 'Não foi possível conectar à API. Confira o servidor.'
                    : e.message
            );
        } finally {
            ocupado = false;
            document.querySelectorAll('button').forEach((b) => (b.disabled = false));
        }
    };
}

function encerrarSessao() {
    token = null;
    fecharFormularioPedido();
    $('pedidos-lista').replaceChildren();
    $('pedidos-status').textContent = '';
    $('pedidos').hidden = true;
    $('dados').textContent = '';
    tela('login');
}

$('sair').onclick = () => {
    encerrarSessao();
    mensagem('Você saiu da conta.');
};

$('admin').onclick = async () => {
    try {
        mensagem((await api('/admin/painel')).mensagem);
    } catch (e) {
        mensagem(e.message);
    }
};

const etapas = {
    aguardando_confirmacao: 'Aguardando confirmação',
    confirmado: 'Confirmado',
    em_preparacao: 'Em preparação',
    despachado: 'Despachado',
    em_transporte: 'Em transporte',
    entregue: 'Entregue',
    cancelado: 'Cancelado'
};

const pedidoForm = $('pedido-form');
const pedidosLista = $('pedidos-lista');
const pedidosStatus = $('pedidos-status');
let pedidoEmEdicao = null;
let atualizandoPedidos = false;

function fecharFormularioPedido() {
    pedidoForm.reset();
    pedidoForm.hidden = true;
    pedidoEmEdicao = null;
}

function abrirFormularioPedido(pedido) {
    pedidoForm.reset();
    pedidoEmEdicao = pedido?.id ?? null;
    $('pedido-titulo').textContent = pedido ? 'Editar pedido' : 'Novo pedido';
    for (const campo of new FormData(pedidoForm).keys()) {
        if (pedido) pedidoForm.elements.namedItem(campo).value = pedido[campo];
    }
    pedidoForm.hidden = false;
    pedidoForm.elements.namedItem('material').focus();
}

function botaoPedido(rotulo, acao) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = rotulo;
    botao.addEventListener('click', acao);
    return botao;
}

function mostrarPedido(pedido) {
    const item = document.createElement('li');
    const titulo = document.createElement('h3');
    titulo.textContent = pedido.material;
    const detalhes = document.createElement('p');
    const prazo = pedido.prazo_combinado.split('-').reverse().join('/');
    detalhes.textContent = `${pedido.quantidade} ${pedido.unidade} · ${pedido.fornecedor} · ${pedido.origem} → ${pedido.destino}`;
    const status = document.createElement('p');
    status.textContent = `${etapas[pedido.etapa] ?? pedido.etapa} · Prazo ${prazo}`;
    item.append(titulo, detalhes, status);
    if (pedido.prazo_vencido) {
        const alerta = document.createElement('strong');
        alerta.className = 'alerta-pedido';
        alerta.textContent = 'Prazo vencido';
        item.append(alerta);
    }
    if (pedido.etapa === 'aguardando_confirmacao') {
        const acoes = document.createElement('div');
        acoes.append(
            botaoPedido('Editar', () =>
                executarAcaoPedido(async () => {
                    const { pedido: atual } = await api('/pedidos/' + pedido.id);
                    abrirFormularioPedido(atual);
                })
            ),
            botaoPedido('Excluir', () => {
                if (
                    atualizandoPedidos ||
                    !window.confirm(`Excluir o pedido de ${pedido.material}?`)
                )
                    return;
                executarAcaoPedido(async () => {
                    await api('/pedidos/' + pedido.id, undefined, 'DELETE');
                    if (pedidoEmEdicao === pedido.id) fecharFormularioPedido();
                    await carregarPedidos('Pedido excluído.');
                });
            })
        );
        item.append(acoes);
    }
    return item;
}

async function carregarPedidos(aviso = '') {
    try {
        const { pedidos } = await api('/pedidos');
        pedidosLista.replaceChildren(...pedidos.map(mostrarPedido));
        pedidosStatus.textContent =
            aviso ||
            (pedidos.length
                ? `${pedidos.length} ${pedidos.length === 1 ? 'pedido cadastrado' : 'pedidos cadastrados'}.`
                : 'Nenhum pedido cadastrado.');
    } catch (erro) {
        pedidosStatus.textContent = aviso ? `${aviso} ${erro.message}` : erro.message;
        if (!token) mensagem(erro.message);
    }
}

async function executarAcaoPedido(acao) {
    if (atualizandoPedidos) return;
    atualizandoPedidos = true;
    const botoes = $('pedidos').querySelectorAll('button');
    botoes.forEach((botao) => (botao.disabled = true));
    $('sair').disabled = true;
    try {
        await acao();
    } catch (erro) {
        pedidosStatus.textContent = erro.message;
        if (!token) mensagem(erro.message);
    } finally {
        atualizandoPedidos = false;
        botoes.forEach((botao) => (botao.disabled = false));
        $('sair').disabled = false;
    }
}

$('novo-pedido').onclick = () => abrirFormularioPedido();
$('fechar-pedido').onclick = fecharFormularioPedido;
$('recarregar-pedidos').onclick = () => executarAcaoPedido(carregarPedidos);
pedidoForm.onsubmit = (evento) => {
    evento.preventDefault();
    const corpo = Object.fromEntries(new FormData(pedidoForm));
    executarAcaoPedido(async () => {
        if (pedidoEmEdicao === null) await api('/pedidos', corpo);
        else await api('/pedidos/' + pedidoEmEdicao, corpo, 'PUT');
        fecharFormularioPedido();
        await carregarPedidos('Pedido salvo.');
    });
};
