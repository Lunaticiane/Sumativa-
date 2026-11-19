$(document).ready(function() {

let $xml = $($.parseXML("<biblioteca></biblioteca>"));

// id do livro em edicao null = modo de registo
let editando = null;

// indica se a area do XML esta aberta
let xmlVisivel = false;


// escreve na area de mensagens (tipo: info, sucesso, erro, aviso)
function mostrarMensagem(texto, tipo) {
  $("#mensagem").attr("class", tipo).text(texto);
}

// procura um livro no XML pelo id (devolve vazio se nao existir)
function acharLivro(id) {
  return $xml.find("livro").filter(function () {
    return $(this).attr("id") === id;
  });
}

// cria um livro no XML
function criarLivro(id, titulo, autor, ano) {
  let $livro = $($xml[0].createElement("livro"));
  $livro.attr("id", id);
  $livro.attr("lido", "nao");
  $livro.append($($xml[0].createElement("titulo")).text(titulo));
  $livro.append($($xml[0].createElement("autor")).text(autor));
  $livro.append($($xml[0].createElement("ano")).text(ano));
  $xml.find("biblioteca").append($livro);
}

// codigo local ainda nao usado: LOCAL-1, LOCAL-2, ...
function novoCodigoLocal() {
  let n = 1;
  while (acharLivro("LOCAL-" + n).length > 0) {
    n++;
  }
  return "LOCAL-" + n;
}

// valida titulo, autor e ano (devolve texto do erro ou vazio)
function validar(titulo, autor, ano) {
  if (titulo.length < 2) {
    return "O titulo e obrigatorio e deve ter pelo menos 2 caracteres.";
  }
  if (autor === "") {
    return "O autor e obrigatorio.";
  }
  if (ano !== "") {
    let anoAtual = new Date().getFullYear();
    if (!/^[0-9]{4}$/.test(ano)) {
      return "O ano deve ter 4 digitos.";
    }
    if (parseInt(ano, 10) > anoAtual) {
      return "O ano nao pode ser superior a " + anoAtual + ".";
    }
  }
  return "";
}


//desenhar tudo a partir do XML
// tabela (usa o filtro)
function desenharTabela() {
  let filtro = $("#filtro").val().trim().toLowerCase();
  let visiveis = 0;

  $("#corpoTabela").empty();

  $xml.find("livro").each(function () {
    let $l = $(this);
    let id = $l.attr("id");
    let titulo = $l.find("titulo").text();
    let autor = $l.find("autor").text();
    let ano = $l.find("ano").text();
    let lido = $l.attr("lido") === "sim";

    // filtro por titulo ou autor
    if (filtro !== "") {
      let achouTitulo = titulo.toLowerCase().indexOf(filtro) !== -1;
      let achouAutor = autor.toLowerCase().indexOf(filtro) !== -1;
      if (!achouTitulo && !achouAutor) { return; }
    }

    visiveis++;

    let $tr = $("<tr>").attr("data-id", id);
    if (lido) { $tr.addClass("lido"); }

    $tr.append($("<td>").text(id));
    $tr.append($("<td>").text(titulo));
    $tr.append($("<td>").text(autor));
    $tr.append($("<td>").text(ano));

    let textoEstado = "Por ler";
    if (lido) { textoEstado = "Lido"; }
    $tr.append($("<td>").append($("<span class='selo'>").text(textoEstado)));

    let textoBotao = "Marcar como lido";
    if (lido) { textoBotao = "Marcar como por ler"; }
    let $acoes = $("<td class='acoes'>");
    $acoes.append($("<button type='button' class='btn-editar'>").text("Editar"));
    $acoes.append($("<button type='button' class='btn-estado'>").text(textoBotao));
    $acoes.append($("<button type='button' class='btn-remover'>").text("Remover"));
    $tr.append($acoes);

    $("#corpoTabela").append($tr);
  });

  // sem resultados
  if (visiveis === 0) {
    let $vazio = $("<td colspan='6' class='vazio'>").text("Nenhum livro na lista");
    $("#corpoTabela").append($("<tr>").append($vazio));
  }
}

// resumo sempre com os totais do XML
function desenharResumo() {
  let total = $xml.find("livro").length;
  let lidos = $xml.find("livro[lido='sim']").length;
  $("#total").text(total);
  $("#lidos").text(lidos);
  $("#porLer").text(total - lidos);
}

// atualiza tudo
function atualizar() {
  desenharTabela();
  desenharResumo();
  desenharXml();
}


//  ver e exportar XML

// serializa o XML e coloca uma linha por elemento, com indentacao
function formatarXml() {
  let texto = new XMLSerializer().serializeToString($xml[0]);
  let linhas = texto.replace(/></g, ">\n<").split("\n");
  let nivel = 0;
  let resultado = "";

  for (let i = 0; i < linhas.length; i++) {
    let linha = linhas[i];
    // linha de fecho: reduz o nivel antes de escrever
    if (linha.indexOf("</") === 0) { nivel--; }
    resultado += "  ".repeat(nivel) + linha + "\n";
    // linha de abertura  aumenta o nivel
    if (linha.indexOf("</") === -1 && linha.indexOf("/>") === -1) { nivel++; }
  }
  return resultado;
}

// mostra o XML atual (so se a area estiver aberta)
function desenharXml() {
  if (xmlVisivel) {
    $("#areaXml").text(formatarXml());
  }
}

$("#btnVerXml").on("click", function () {
  xmlVisivel = !xmlVisivel;
  if (xmlVisivel) {
    $("#caixaXml").show();
    $(this).text("Ocultar XML");
    desenharXml();
  } else {
    $("#caixaXml").hide();
    $(this).text("Ver XML");
  }
});

// descarrega o XML como ficheiro leituras.xml
$("#btnExportar").on("click", function () {
  let conteudo = '<?xml version="1.0" encoding="UTF-8"?>\n' + formatarXml();
  let blob = new Blob([conteudo], { type: "application/xml" });
  let url = URL.createObjectURL(blob);
  let $a = $("<a>").attr({ href: url, download: "leituras.xml" });
  $("body").append($a);
  $a[0].click();
  $a.remove();
  URL.revokeObjectURL(url);
  mostrarMensagem("Ficheiro leituras.xml exportado.", "sucesso");
});


// Tarefa 2 pesquisa no catalogo por Ajax 

$("#formPesquisa").on("submit", function (e) {
  e.preventDefault(); // nao recarrega a pagina

  let termo = $("#termo").val().trim();
  if (termo.length < 2) {
    mostrarMensagem("Escreva pelo menos 2 caracteres para pesquisar.", "erro");
    return;
  }




  $.ajax({
    url: "https://openlibrary.org/search.json",
    method: "GET",
    dataType: "json",
    data: {
      q: termo,
      limit: 10,
      fields: "key,title,author_name,first_publish_year"
    },
    beforeSend: function () {
      mostrarMensagem("A pesquisar no catálogo...", "info");
      $("#btnPesquisar").prop("disabled", true);
    },
    success: function (dados) {
      let livros = dados.docs;

      // nenhum livro devolvido pelo servico
      if (!livros || livros.length === 0) {
        mostrarMensagem("Nenhum livro encontrado no catalogo", "aviso");
        return;
      }

      // Tarefa 3 criar os livros no XML
      let novos = 0;
      $.each(livros, function (i, l) {
        // evita duplicados
        if (acharLivro(l.key).length === 0) {
          let titulo = l.title || "Sem titulo";
          let autor = "Autor desconhecido";
          if (l.author_name && l.author_name.length > 0) {
            autor = l.author_name[0]; // so o primeiro autor
          }
          let ano = "N";
          if (l.first_publish_year) {
            ano = String(l.first_publish_year);
          }
          criarLivro(l.key, titulo, autor, ano);
          novos++;
        }
      });

      atualizar();
      mostrarMensagem(novos + " livro(s) adicionado(s) A lista", "sucesso");
    },
    error: function (xhr) {
      // os registos locais ficam preservados
      let texto = "Nao foi possivel pesquisar no catalogo.";
      if (xhr.status) {
        texto += " Codigo HTTP: " + xhr.status;
      } else {
        texto += " Verifique a ligao a internet.";
      }
      mostrarMensagem(texto, "erro");
    },
    complete: function () {
      $("#btnPesquisar").prop("disabled", false);
    }
  });
});


// Tarefa 4 filtro so no XML

$("#filtro").on("input", desenharTabela);


//Tarefa 5 gestao dos livros 

// volta ao modo de registo
function limparFormulario() {
  $("#titulo").val("");
  $("#autor").val("");
  $("#ano").val("");
  editando = null;
  $("#tituloForm").text("Registar livro");
}

// guardar: adicionar ou editar
$("#formLivro").on("submit", function (e) {
  e.preventDefault();

  let titulo = $("#titulo").val().trim();
  let autor = $("#autor").val().trim();
  let ano = $("#ano").val().trim();

  let erro = validar(titulo, autor, ano);
  if (erro !== "") {
    mostrarMensagem(erro, "erro");
    return;
  }
  if (ano === "") { ano = "N"; }

  if (editando === null) {
    // adicionar com codigo local
    criarLivro(novoCodigoLocal(), titulo, autor, ano);
    mostrarMensagem("Livro adicionado: " + titulo, "sucesso");
  } else {
    // editar mantendo o codigo e o estado de leitura
    let $l = acharLivro(editando);
    $l.find("titulo").text(titulo);
    $l.find("autor").text(autor);
    $l.find("ano").text(ano);
    mostrarMensagem("Livro atualizado: " + titulo, "sucesso");
  }

  limparFormulario();
  atualizar();
});

// cancelar
$("#btnCancelar").on("click", function () {
  limparFormulario();
  mostrarMensagem("Edicao cancelada.", "info");
});

// editar carrega os dados no formulario
$("#corpoTabela").on("click", ".btn-editar", function () {
  let id = $(this).closest("tr").attr("data-id");
  let $l = acharLivro(id);
  let ano = $l.find("ano").text();
  if (ano === "N") { ano = ""; }

  $("#titulo").val($l.find("titulo").text());
  $("#autor").val($l.find("autor").text());
  $("#ano").val(ano);

  editando = id;
  $("#tituloForm").text("Editar livro");
  mostrarMensagem("A editar o livro " + $l.find("titulo").text() + ".", "aviso");
  $("#titulo").focus();
});

// marcar como lido / por ler
$("#corpoTabela").on("click", ".btn-estado", function () {
  let id = $(this).closest("tr").attr("data-id");
  let $l = acharLivro(id);
  let titulo = $l.find("titulo").text();

  if ($l.attr("lido") === "sim") {
    $l.attr("lido", "nao");
    mostrarMensagem("Livro " + titulo + " marcado como por ler.", "aviso");
  } else {
    $l.attr("lido", "sim");
    mostrarMensagem("Livro " + titulo + " marcado como lido.", "sucesso");
  }
  atualizar();
});

// remover com confirmacao
$("#corpoTabela").on("click", ".btn-remover", function () {
  let id = $(this).closest("tr").attr("data-id");
  let $l = acharLivro(id);
  let titulo = $l.find("titulo").text();

  if (!confirm("Remover o livro: " + titulo + "?")) {
    return;
  }

  $l.remove();
  // se o livro removido estava em edicao, limpa o formulario
  if (editando === id) {
    limparFormulario();
  }
  atualizar();
  mostrarMensagem("Livro removido: " + titulo, "aviso");
});

atualizar();
});
