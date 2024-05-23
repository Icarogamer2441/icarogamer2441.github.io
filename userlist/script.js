function addUser() {
    const username = document.getElementById("username");
    let usernamevalue = username.value;

    const userage = document.getElementById("userage");
    let useragevalue = userage.value;

    const usertype = document.getElementById("usertype");
    let usertypevalue = usertype.value;

    const usersContainer = document.getElementById("users");
    usersContainer.innerHTML += `<div class="user-box">
    <h1>Nome:</h1>
    <p>${usernamevalue}</p>
    <h1>Idade:</h1>
    <p>${useragevalue}</p>
    <h1>Tipo de usuario</h1>
    <p>${usertypevalue}</p>
</div>`;

    var content = document.getElementById('users').innerHTML;
    localStorage.removeItem('savedContent', content);
    localStorage.setItem('savedContent', content);
    console.log('Usuario adicionado!');
}

function clearUsers() {
    const usersContainer = document.getElementById("users");

    usersContainer.innerHTML = ""

    var content = document.getElementById('users').innerHTML;
    localStorage.clear('savedContent', content);
    alert('Lista de usuarios limpa!');
}

function loadContent() {
    var savedContent = localStorage.getItem('savedContent');
    if (savedContent) {
        document.getElementById('users').innerHTML = savedContent;
        console.log('Conteúdo carregado!');
    } else {
        console.log('Nenhum conteúdo salvo encontrado.');
    }
}

window.onload = function() {
    loadContent()
}
