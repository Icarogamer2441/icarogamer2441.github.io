// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('three-container').appendChild(renderer.domElement);

// Add a simple cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Launcher UI logic
const launchButton = document.getElementById('launch-button');
const versionSelect = document.getElementById('version');
const messageElement = document.getElementById('message');

launchButton.addEventListener('click', () => {
    const selectedVersion = versionSelect.value;
    if (selectedVersion === 'B1.0') {
        // Redirect to the B1.0 game page
        window.location.href = 'versions/b1.0.html';
    } else if (selectedVersion === 'B1.1') {
        // Redirect to the B1.1 game page
        window.location.href = 'versions/b1.1.html';
    } else if (selectedVersion === 'B1.2') {
        // Redirect to the B1.2 game page
        window.location.href = 'versions/b1.2.html';
    } else {
        // Future game launch logic would go here
        messageElement.textContent = `Launching version ${selectedVersion}...`;
        messageElement.classList.remove('hidden');
    }
});