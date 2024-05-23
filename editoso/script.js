function AddTitle() {
    const content = document.getElementById("content");

    content.innerHTML += `<div class="title">
    <h1 contenteditable="">Title</h1>
</div>
`;
}

function AddSubtitle() {
    const content = document.getElementById("content");

    content.innerHTML += `<div class="subtitle">
    <h3 contenteditable="">Subtitle</h3>
</div>
`;
}

function AddText() {
    const content = document.getElementById("content");

    content.innerHTML += `<div class="text">
    <p contenteditable="">text</p>
</div>
`;
}

function RemoveContent() {
    const content = document.getElementById("content");

    content.innerHTML = "";
}

function AddAllItems() {
    const content = document.getElementById("content");

    content.innerHTML += `<div class="title">
    <h1 contenteditable="">Title</h1>
</div>
`;
    content.innerHTML += `<div class="subtitle">
<h3 contenteditable="">Subtitle</h3>
</div>
`;
    content.innerHTML += `<div class="text">
<p contenteditable="">text</p>
</div>
`;
}
