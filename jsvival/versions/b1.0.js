let scene, camera, renderer;
let chunks = new Map(); // Armazena os chunks do terreno
let treesInChunks = new Map(); // Array global para armazenar as árvores de cada chunk
let animalsInChunks = new Map(); // Array global para armazenar os animais de cada chunk
let cloudSystem;
let player = { x: 0, y: 2, z: 0, velocity: 0, isJumping: false };
let isPaused = false;
const simplex = new SimplexNoise();
const chunkSize = 256; // Chunks maiores
const chunksVisible = 3; // Quantidade de chunks visíveis em cada direção
const scale = 100;
const heightScale = 3;
const viewDistance = 256; // Aumentado para as nuvens
const gravity = 0.015;
const jumpForce = 0.3;
let keysPressed = {};

// Configurações dos biomas
const BIOMES = {
    PLAINS: { 
        color: 0x3d9e41, 
        heightScale: 2, 
        roughness: 0.3, 
        vegetation: { type: 'none', density: 0 },
        animals: {
            pig: { density: 0.02 },
            fly: { density: 0.001 }
        }
    },
    MOUNTAINS: { 
        color: 0x8b8b8b, 
        heightScale: 8, 
        roughness: 0.7, 
        vegetation: { type: 'none', density: 0 },
        animals: {
            pig: { density: 0 },
            fly: { density: 0.001 }
        }
    },
    DESERT: { 
        color: 0xdeb887, 
        heightScale: 1, 
        roughness: 0.2, 
        vegetation: { type: 'cactus', density: 0.01 },
        animals: {
            pig: { density: 0 },
            fly: { density: 0.002 }
        }
    },
    FOREST: { 
        color: 0x2d5a27, 
        heightScale: 2.5, 
        roughness: 0.4, 
        vegetation: { type: 'tree', density: 0.03 },
        animals: {
            pig: { density: 0.015 },
            fly: { density: 0.001 }
        }
    }
};

// Cache de geometrias
const vegetationGeometries = {
    tree: {
        trunk: null,
        leaves: null
    },
    cactus: {
        type1: null,
        type2: null,
        type3: null
    }
};

// Cache de geometrias de animais
const animalGeometries = {
    pig: {
        body: null,
        head: null,
        legs: null
    },
    fly: {
        body: null,
        wings: null
    }
};

class CloudParticle {
    constructor(x, y, z) {
        const geometry = new THREE.SphereGeometry(30 + Math.random() * 15, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6 + Math.random() * 0.2,
            roughness: 1,
            fog: false // Desabilitar o efeito de fog nas nuvens
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, y, z);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.2
        );
        this.lifetime = 20000 + Math.random() * 30000; // 20-50 seconds
        this.birthTime = Date.now();
    }

    update() {
        this.mesh.position.add(this.velocity);
        const age = Date.now() - this.birthTime;
        if (age > this.lifetime * 0.8) {
            const fade = 1 - ((age - (this.lifetime * 0.8)) / (this.lifetime * 0.2));
            this.mesh.material.opacity = Math.max(0, fade * 0.8);
        }
        return age < this.lifetime;
    }
}

class Cloud {
    constructor(x, y, z) {
        this.group = new THREE.Group();
        this.group.position.set(x, y, z);
        this.particles = [];
        this.targetSize = 50 + Math.random() * 3950; // Entre 50 e 4000 partículas
        this.lastGrowthCheck = Date.now();
        this.growthRate = 0.5; // Partículas por segundo aumentado
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.5
        );
    }

    update() {
        // Atualizar partículas existentes
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!particle.update()) {
                this.group.remove(particle.mesh);
                this.particles.splice(i, 1);
            }
        }

        // Adicionar novas partículas
        const now = Date.now();
        const deltaTime = now - this.lastGrowthCheck;
        this.lastGrowthCheck = now;

        if (this.particles.length < this.targetSize) {
            const particlesToAdd = Math.floor(this.growthRate * deltaTime / 1000);
            for (let i = 0; i < particlesToAdd; i++) {
                this.addParticle();
            }
        }

        // Mover a nuvem
        this.group.position.add(this.velocity);

        // Mudar tamanho aleatoriamente com mais frequência
        if (Math.random() < 0.002) {
            this.targetSize = 50 + Math.random() * 3950;
            this.growthRate = 0.3 + Math.random() * 0.5; // Taxa de crescimento variável
        }
    }

    addParticle() {
        const offset = 400; // Área ainda maior para nuvens maiores
        const particle = new CloudParticle(
            (Math.random() - 0.5) * offset,
            (Math.random() - 0.5) * offset * 0.3,
            (Math.random() - 0.5) * offset
        );
        this.particles.push(particle);
        this.group.add(particle.mesh);
    }

    checkCloudCollision(otherCloud) {
        const distance = this.group.position.distanceTo(otherCloud.group.position);
        if (distance < 600) { // Distância de colisão aumentada para nuvens maiores
            // Fundir nuvens se estiverem muito próximas
            if (distance < 300 && this.particles.length + otherCloud.particles.length < 4000) {
                return 'merge';
            }
            // Caso contrário, repelir
            const repelStrength = 0.1;
            const direction = new THREE.Vector3()
                .subVectors(this.group.position, otherCloud.group.position)
                .normalize();
            
            this.velocity.add(direction.multiplyScalar(repelStrength));
            otherCloud.velocity.sub(direction.multiplyScalar(repelStrength));
        }
        return 'none';
    }
}

class CloudSystem {
    constructor() {
        this.clouds = [];
        this.lastCloudCheck = Date.now();
    }

    update() {
        // Atualizar nuvens existentes
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            this.clouds[i].update();
            
            // Remover nuvens muito distantes
            const distance = this.clouds[i].group.position.distanceTo(
                new THREE.Vector3(player.x, player.y + 300, player.z)
            );
            if (distance > viewDistance * 6) {
                scene.remove(this.clouds[i].group);
                this.clouds.splice(i, 1);
                continue;
            }
        }

        // Verificar interações entre nuvens
        for (let i = 0; i < this.clouds.length; i++) {
            for (let j = i + 1; j < this.clouds.length; j++) {
                const result = this.clouds[i].checkCloudCollision(this.clouds[j]);
                if (result === 'merge') {
                    const cloud1 = this.clouds[i];
                    const cloud2 = this.clouds[j];
                    
                    // Transferir partículas
                    cloud2.particles.forEach(particle => {
                        particle.mesh.position.add(cloud2.group.position).sub(cloud1.group.position);
                        cloud1.group.add(particle.mesh);
                        cloud1.particles.push(particle);
                    });
                    
                    // Remover segunda nuvem
                    scene.remove(cloud2.group);
                    this.clouds.splice(j, 1);
                    j--;
                    
                    // Atualizar tamanho alvo
                    cloud1.targetSize = Math.min(2000, cloud1.targetSize + cloud2.targetSize);
                }
            }
        }

        // Gerar novas nuvens
        const now = Date.now();
        if (now - this.lastCloudCheck > 5000) { // A cada 5 segundos
            this.lastCloudCheck = now;
            if (this.clouds.length < 60 && Math.random() < 0.6) {
                const angle = Math.random() * Math.PI * 2;
                const distance = viewDistance * 4;
                const x = player.x + Math.cos(angle) * distance;
                const z = player.z + Math.sin(angle) * distance;
                const y = 300 + Math.random() * 300; // Altura das nuvens ainda mais variada
                
                const cloud = new Cloud(x, y, z);
                scene.add(cloud.group);
                this.clouds.push(cloud);
            }
        }
    }
}

function init() {
    // Configuração da cena
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, viewDistance * 8);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Criar menu de pausa
    createPauseMenu();
    
    // Inicializar geometrias da vegetação e animais
    initVegetationGeometries();
    initAnimalGeometries();
    
    // Configuração do céu e fog
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.0005); // Fog mais suave para ver as nuvens
    
    // Configurações de renderização
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Inicializar sistema de nuvens
    cloudSystem = new CloudSystem();

    // Luz direcional (sol)
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(100, 300, 50); // Sol mais alto para iluminar as nuvens
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 1000; // Aumentado para alcançar as nuvens
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    scene.add(sun);
    
    // Luz ambiente para áreas sombreadas
    scene.add(new THREE.AmbientLight(0x87CEEB, 0.4));

    // Gerar chunks iniciais
    updateChunks();

    // Posicionar câmera
    camera.position.set(player.x, player.y + 1.7, player.z);
    camera.rotation.order = 'YXZ';

    // Eventos
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key] = true;
        if (e.key === 'Control') {
            togglePause();
        }
    });
    document.addEventListener('keyup', (e) => keysPressed[e.key] = false);
    document.addEventListener('mousemove', onMouseMove);
    document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
    document.addEventListener('click', () => {
        if (!isPaused) document.body.requestPointerLock();
    });
    
    // Iniciar loop de animação
    animate();
}

function generateChunk(chunkX, chunkZ) {
    const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 128, 128);
    geometry.rotateX(-Math.PI / 2);
    
    const worldX = chunkX * chunkSize;
    const worldZ = chunkZ * chunkSize;
    
    // Gerar altura e biomas do terreno
    const vertices = geometry.attributes.position.array;
    const colors = new Float32Array(vertices.length);
    const vertexColors = new THREE.BufferAttribute(colors, 3);
    geometry.setAttribute('color', vertexColors);
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i] + worldX;
        const z = vertices[i + 2] + worldZ;
        
        // Determinar bioma e altura
        const { height, biome } = getTerrainData(x, z);
        vertices[i + 1] = height;
        
        // Definir cor do vértice baseado no bioma
        const color = new THREE.Color(biome.color);
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0,
        roughness: 0.8
    });

    const chunk = new THREE.Mesh(geometry, material);
    chunk.position.set(worldX, 0, worldZ);
    chunk.receiveShadow = true;
    scene.add(chunk);
    return chunk;
}

function getTerrainData(x, z) {
    // Noise para seleção de bioma (mudança mais suave)
    const biomeScale = 0.001;
    const biomeNoise = simplex.noise2D(x * biomeScale, z * biomeScale);
    
    // Noise para detalhes do terreno
    const baseScale = 0.003;
    const detailScale = 0.03;
    const roughScale = 0.1;

    // Determinar bioma baseado no noise
    let biome;
    if (biomeNoise < -0.3) {
        biome = BIOMES.DESERT;
    } else if (biomeNoise > 0.3) {
        biome = BIOMES.MOUNTAINS;
    } else if (biomeNoise > -0.1 && biomeNoise < 0.1) {
        biome = BIOMES.FOREST;
    } else {
        biome = BIOMES.PLAINS;
    }

    // Calcular altura com múltiplas camadas de noise
    const baseHeight = simplex.noise2D(x * baseScale, z * baseScale);
    const details = simplex.noise2D(x * detailScale, z * detailScale) * 0.3;
    const roughness = simplex.noise2D(x * roughScale, z * roughScale) * 0.1;

    // Aplicar características do bioma
    const height = (baseHeight + details + roughness) * biome.heightScale;

    return { height, biome };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const euler = new THREE.Euler(0, 0, 0, 'YXZ');

function onMouseMove(event) {
    if (document.pointerLockElement === document.body) {
        euler.setFromQuaternion(camera.quaternion);
        
        euler.y -= event.movementX * 0.003;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x - event.movementY * 0.003));
        
        camera.quaternion.setFromEuler(euler);
    }
}

function updateChunks() {
    // Determinar chunks próximos ao jogador
    const currentChunkX = Math.floor(player.x / chunkSize);
    const currentChunkZ = Math.floor(player.z / chunkSize);

    // Remover chunks distantes
    for (const [key, chunkData] of chunks) {
        const [chunkX, chunkZ] = key.split(',').map(Number);
        if (Math.abs(chunkX - currentChunkX) > chunksVisible || 
            Math.abs(chunkZ - currentChunkZ) > chunksVisible) {
            scene.remove(chunkData.terrain);
            scene.remove(chunkData.trees);
            treesInChunks.delete(key);
            chunks.delete(key);
        }
    }

    // Gerar novos chunks próximos
    for (let x = -chunksVisible; x <= chunksVisible; x++) {
        for (let z = -chunksVisible; z <= chunksVisible; z++) {
            const chunkX = currentChunkX + x;
            const chunkZ = currentChunkZ + z;
            const key = `${chunkX},${chunkZ}`;

            if (!chunks.has(key)) {
                const chunk = generateChunk(chunkX, chunkZ);
                const vegetation = generateVegetationForChunk(chunkX, chunkZ);
                const animals = generateAnimalsForChunk(chunkX, chunkZ);
                scene.add(vegetation);
                scene.add(animals);
                chunks.set(key, { terrain: chunk, trees: vegetation, animals: animals });
            }
        }
    }
}

function updatePlayer() {
    // Se o jogo estiver pausado, não atualizar o jogador
    if (isPaused) return;

    const speed = 0.5;
    const direction = new THREE.Vector3();
    
    // Get camera's forward direction
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    // Calculate right vector
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    
    // Apply movement based on keys
    if (keysPressed['w'] || keysPressed['W'] || keysPressed['ArrowUp']) {
        player.x += forward.x * speed;
        player.z += forward.z * speed;
    }
    if (keysPressed['s'] || keysPressed['S'] || keysPressed['ArrowDown']) {
        player.x -= forward.x * speed;
        player.z -= forward.z * speed;
    }
    if (keysPressed['a'] || keysPressed['A'] || keysPressed['ArrowLeft']) {
        player.x -= right.x * speed;
        player.z -= right.z * speed;
    }
    if (keysPressed['d'] || keysPressed['D'] || keysPressed['ArrowRight']) {
        player.x += right.x * speed;
        player.z += right.z * speed;
    }

    // Debug do movimento
    if (direction.length() > 0) {
        console.log('Direção:', direction);
    }

    // Update camera position to follow player
    camera.position.set(player.x, player.y + 1.7, player.z);

    // Jump system
    const { height } = getTerrainData(player.x, player.z);
    if (keysPressed[' '] && !player.isJumping && player.y <= height + 2.1) {
        player.velocity = jumpForce;
        player.isJumping = true;
    }

    // Apply gravity and update height
    player.velocity -= gravity;
    player.y += player.velocity;

    // Ground collision
    if (player.y < height + 2) {
        player.y = height + 2;
        player.velocity = 0;
        player.isJumping = false;
    }

    // Camera height is handled above
}

function animate() {
    requestAnimationFrame(animate);
    if (!isPaused) {
        updatePlayer();
        updateChunks();
        updateAnimals();
        cloudSystem.update();
    }
    renderer.render(scene, camera);
}

// Iniciar o jogo
init();

function initVegetationGeometries() {
    // Geometrias da árvore
    vegetationGeometries.tree.trunk = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
    vegetationGeometries.tree.leaves = new THREE.ConeGeometry(2, 4, 8);
    
    // Geometrias dos cactus
    // Tipo 1: Cactus alto com dois braços
    vegetationGeometries.cactus.type1 = new THREE.Group();
    const mainStem1 = new THREE.CylinderGeometry(0.3, 0.4, 5, 8);
    const arm1 = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    const arm2 = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
    
    // Tipo 2: Cactus baixo e gordo
    vegetationGeometries.cactus.type2 = new THREE.CylinderGeometry(0.5, 0.6, 3, 10);
    
    // Tipo 3: Cactus com três seções
    vegetationGeometries.cactus.type3 = new THREE.Group();
    const mainStem3 = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
    const section1 = new THREE.CylinderGeometry(0.25, 0.25, 2, 8);
    const section2 = new THREE.CylinderGeometry(0.25, 0.25, 2, 8);
}

function initAnimalGeometries() {
    // Geometrias do porco
    animalGeometries.pig.body = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    animalGeometries.pig.head = new THREE.BoxGeometry(0.5, 0.5, 0.4);
    animalGeometries.pig.legs = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);

    // Geometrias da mosca
    animalGeometries.fly.body = new THREE.SphereGeometry(0.1, 8, 8);
    animalGeometries.fly.wings = new THREE.PlaneGeometry(0.2, 0.1);
}

function createVegetation(type, x, z, height) {
    switch(type) {
        case 'tree':
            return createTree(x, z, height);
        case 'cactus':
            return createCactus(x, z, height);
        default:
            return null;
    }
}

function createTree(x, z, height) {
    // Criar o tronco
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a2f22,
        roughness: 0.9
    });
    const trunk = new THREE.Mesh(vegetationGeometries.tree.trunk, trunkMaterial);
    trunk.position.set(x, height + 2, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    // Criar as folhas
    const leavesMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a4d1a,
        roughness: 0.8
    });
    const leaves = new THREE.Mesh(vegetationGeometries.tree.leaves, leavesMaterial);
    leaves.position.set(x, height + 5, z);
    leaves.castShadow = true;
    leaves.receiveShadow = true;

    // Grupo para a árvore completa
    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(leaves);
    tree.rotation.y = Math.random() * Math.PI * 2;
    return tree;
}

function createCactus(x, z, height) {
    const cactusType = Math.floor(Math.random() * 3) + 1;
    const cactusMaterial = new THREE.MeshStandardMaterial({
        color: 0x2F6D45,
        roughness: 0.8
    });
    
    const cactus = new THREE.Group();
    
    switch(cactusType) {
        case 1: // Cactus alto com dois braços
            const mainStem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 5, 8), cactusMaterial);
            mainStem.position.set(0, 2.5, 0);
            
            const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2, 8), cactusMaterial);
            arm1.position.set(0.4, 3, 0);
            arm1.rotation.z = Math.PI / 4;
            
            const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8), cactusMaterial);
            arm2.position.set(-0.3, 2.5, 0);
            arm2.rotation.z = -Math.PI / 4;
            
            cactus.add(mainStem, arm1, arm2);
            break;
            
        case 2: // Cactus baixo e gordo
            const fatCactus = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3, 10), cactusMaterial);
            fatCactus.position.set(0, 1.5, 0);
            cactus.add(fatCactus);
            break;
            
        case 3: // Cactus com três seções
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 8), cactusMaterial);
            base.position.set(0, 2, 0);
            
            const section1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2, 8), cactusMaterial);
            section1.position.set(0.4, 2.5, 0);
            section1.rotation.z = Math.PI / 6;
            
            const section2 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2, 8), cactusMaterial);
            section2.position.set(-0.4, 3, 0);
            section2.rotation.z = -Math.PI / 6;
            
            cactus.add(base, section1, section2);
            break;
    }
    
    cactus.position.set(x, height, z);
    cactus.rotation.y = Math.random() * Math.PI * 2;
    cactus.traverse(child => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    return cactus;
}

// Remover esta declaração pois já está no início do arquivo

function generateVegetationForChunk(chunkX, chunkZ) {
    const vegetation = new THREE.Group();
    const chunkKey = `${chunkX},${chunkZ}`;
    
    // Gerar vegetação apenas na primeira vez
    if (!treesInChunks.has(chunkKey)) {
        const worldX = chunkX * chunkSize;
        const worldZ = chunkZ * chunkSize;
        
        // Gerar vegetação com base na densidade do bioma
        for (let x = 0; x < chunkSize; x += 10) {
            for (let z = 0; z < chunkSize; z += 10) {
                const posX = worldX + x + (Math.random() * 8 - 4);
                const posZ = worldZ + z + (Math.random() * 8 - 4);
                
                const { height, biome } = getTerrainData(posX, posZ);
                
                // Verificar se devemos colocar vegetação aqui
                if (biome.vegetation.density > 0 && Math.random() < biome.vegetation.density) {
                    const plant = createVegetation(biome.vegetation.type, posX, posZ, height);
                    if (plant) vegetation.add(plant);
                }
            }
        }
        
        treesInChunks.set(chunkKey, vegetation);
    } else {
        return treesInChunks.get(chunkKey);
    }
    
    return vegetation;
}

function checkTreeCollision(newX, newZ) {
    const playerRadius = 0.5; // Raio de colisão do jogador
    const treeRadius = 0.3;   // Raio de colisão do tronco da árvore

    // Verificar árvores nos chunks próximos
    const currentChunkX = Math.floor(newX / chunkSize);
    const currentChunkZ = Math.floor(newZ / chunkSize);

    for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
            const chunkKey = `${currentChunkX + x},${currentChunkZ + z}`;
            const chunkData = chunks.get(chunkKey);
            
            if (chunkData && chunkData.trees) {
                // Verificar cada árvore no chunk
                for (const tree of chunkData.trees.children) {
                    const trunk = tree.children[0]; // O primeiro filho é o tronco
                    const dx = newX - trunk.position.x;
                    const dz = newZ - trunk.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    // Se houver colisão, retornar true
                    if (distance < playerRadius + treeRadius) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function createAnimal(type, x, z, height) {
    switch(type) {
        case 'pig':
            return createPig(x, z, height);
        case 'fly':
            return createFly(x, z, height);
        default:
            return null;
    }
}

function createPig(x, z, height) {
    const group = new THREE.Group();
    
    // Corpo do porco
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xffb6c1, // Rosa claro
        roughness: 0.8
    });
    
    const body = new THREE.Mesh(animalGeometries.pig.body, bodyMaterial);
    body.position.y = 0.4;
    
    // Cabeça
    const head = new THREE.Mesh(animalGeometries.pig.head, bodyMaterial);
    head.position.set(0.7, 0.4, 0);
    
    // Pernas
    const legs = [];
    const legPositions = [
        [-0.3, 0, -0.3],
        [-0.3, 0, 0.3],
        [0.3, 0, -0.3],
        [0.3, 0, 0.3]
    ];
    
    for (const pos of legPositions) {
        const leg = new THREE.Mesh(animalGeometries.pig.legs, bodyMaterial);
        leg.position.set(...pos);
        leg.userData = { originalY: pos[1] }; // Para animação
        legs.push(leg);
        group.add(leg);
    }
    
    group.add(body, head);
    group.position.set(x, height + 0.2, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    
    // Adicionar propriedades para animação e comportamento
    group.userData = {
        type: 'pig',
        speed: 0.2 + Math.random() * 0.3,
        direction: new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(),
        lastDirectionChange: Date.now(),
        nextDirectionChange: 3000 + Math.random() * 5000,
        legs: legs,
        animationPhase: Math.random() * Math.PI * 2
    };
    
    return group;
}

function createFly(x, z, height) {
    const group = new THREE.Group();
    
    // Corpo da mosca
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5
    });
    
    const body = new THREE.Mesh(animalGeometries.fly.body, bodyMaterial);
    
    // Asas
    const wingMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const leftWing = new THREE.Mesh(animalGeometries.fly.wings, wingMaterial);
    const rightWing = new THREE.Mesh(animalGeometries.fly.wings, wingMaterial);
    
    leftWing.position.set(0, 0, 0.1);
    rightWing.position.set(0, 0, -0.1);
    
    group.add(body, leftWing, rightWing);
    group.position.set(x, height + 1 + Math.random() * 2, z);
    
    // Adicionar propriedades para animação e comportamento
    group.userData = {
        type: 'fly',
        speed: 0.3 + Math.random() * 0.4,
        direction: new THREE.Vector3(
            Math.random() - 0.5,
            (Math.random() - 0.3) * 0.5, // Tendência a subir
            Math.random() - 0.5
        ).normalize(),
        lastDirectionChange: Date.now(),
        nextDirectionChange: 1000 + Math.random() * 2000,
        wings: [leftWing, rightWing],
        animationPhase: Math.random() * Math.PI * 2
    };
    
    return group;
}

function createPauseMenu() {
    const menuDiv = document.createElement('div');
    menuDiv.style.position = 'fixed';
    menuDiv.style.top = '50%';
    menuDiv.style.left = '50%';
    menuDiv.style.transform = 'translate(-50%, -50%)';
    menuDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    menuDiv.style.padding = '20px';
    menuDiv.style.borderRadius = '10px';
    menuDiv.style.display = 'none';
    menuDiv.style.zIndex = '1000';
    menuDiv.id = 'pauseMenu';

    const continueBtn = document.createElement('button');
    continueBtn.textContent = 'Continue Playing';
    continueBtn.style.display = 'block';
    continueBtn.style.margin = '10px';
    continueBtn.style.padding = '10px 20px';
    continueBtn.style.backgroundColor = '#4CAF50';
    continueBtn.style.color = 'white';
    continueBtn.style.border = 'none';
    continueBtn.style.borderRadius = '5px';
    continueBtn.style.cursor = 'pointer';
    continueBtn.onclick = () => togglePause();

    const exitBtn = document.createElement('button');
    exitBtn.textContent = 'Exit';
    exitBtn.style.display = 'block';
    exitBtn.style.margin = '10px';
    exitBtn.style.padding = '10px 20px';
    exitBtn.style.backgroundColor = '#f44336';
    exitBtn.style.color = 'white';
    exitBtn.style.border = 'none';
    exitBtn.style.borderRadius = '5px';
    exitBtn.style.cursor = 'pointer';
    exitBtn.onclick = () => window.location.href = '../index.html';

    menuDiv.appendChild(continueBtn);
    menuDiv.appendChild(exitBtn);
    document.body.appendChild(menuDiv);
}

function togglePause() {
    isPaused = !isPaused;
    const menu = document.getElementById('pauseMenu');
    if (isPaused) {
        menu.style.display = 'block';
        document.exitPointerLock();
    } else {
        menu.style.display = 'none';
        document.body.requestPointerLock();
    }
}

function generateAnimalsForChunk(chunkX, chunkZ) {
    const animals = new THREE.Group();
    const chunkKey = `${chunkX},${chunkZ}`;
    
    // Gerar animais apenas na primeira vez
    if (!animalsInChunks.has(chunkKey)) {
        const worldX = chunkX * chunkSize;
        const worldZ = chunkZ * chunkSize;
        
        // Gerar animais com base na densidade do bioma
        for (let x = 0; x < chunkSize; x += 20) { // Espaçamento maior para animais
            for (let z = 0; z < chunkSize; z += 20) {
                const posX = worldX + x + (Math.random() * 16 - 8);
                const posZ = worldZ + z + (Math.random() * 16 - 8);
                
                const { height, biome } = getTerrainData(posX, posZ);
                
                // Verificar porcos
                if (biome.animals.pig && Math.random() < biome.animals.pig.density) {
                    const pig = createAnimal('pig', posX, posZ, height);
                    if (pig) animals.add(pig);
                }
                
                // Verificar moscas
                if (biome.animals.fly && Math.random() < biome.animals.fly.density) {
                    const fly = createAnimal('fly', posX, posZ, height);
                    if (fly) animals.add(fly);
                }
            }
        }
        
        animalsInChunks.set(chunkKey, animals);
    } else {
        return animalsInChunks.get(chunkKey);
    }
    
    return animals;
}

function updateAnimals() {
    const time = Date.now();
    const playerChunkX = Math.floor(player.x / chunkSize);
    const playerChunkZ = Math.floor(player.z / chunkSize);
    
    // Atualizar apenas animais em chunks próximos
    for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
            const chunkKey = `${playerChunkX + x},${playerChunkZ + z}`;
            const animals = animalsInChunks.get(chunkKey);
            
            if (animals) {
                animals.children.forEach(animal => {
                    if (time - animal.userData.lastDirectionChange > animal.userData.nextDirectionChange) {
                        // Mudar direção
                        if (animal.userData.type === 'pig') {
                            animal.userData.direction.set(
                                Math.random() - 0.5,
                                Math.random() - 0.5
                            ).normalize();
                        } else if (animal.userData.type === 'fly') {
                            animal.userData.direction.set(
                                Math.random() - 0.5,
                                (Math.random() - 0.3) * 0.5,
                                Math.random() - 0.5
                            ).normalize();
                        }
                        
                        animal.userData.lastDirectionChange = time;
                        animal.userData.nextDirectionChange = (animal.userData.type === 'pig' ? 3000 : 1000) + Math.random() * 2000;
                    }
                    
                    // Atualizar posição
                    if (animal.userData.type === 'pig') {
                        const newX = animal.position.x + animal.userData.direction.x * animal.userData.speed;
                        const newZ = animal.position.z + animal.userData.direction.y * animal.userData.speed;
                        const { height } = getTerrainData(newX, newZ);
                        
                        animal.position.set(newX, height + 0.2, newZ);
                        animal.rotation.y = Math.atan2(animal.userData.direction.x, animal.userData.direction.y);
                        
                        // Animar pernas
                        animal.userData.animationPhase += 0.1;
                        animal.userData.legs.forEach((leg, i) => {
                            leg.position.y = leg.userData.originalY + Math.sin(animal.userData.animationPhase + i * Math.PI/2) * 0.1;
                        });
                    } else if (animal.userData.type === 'fly') {
                        animal.position.add(animal.userData.direction.multiplyScalar(animal.userData.speed));
                        
                        // Animar asas
                        animal.userData.animationPhase += 0.3;
                        animal.userData.wings.forEach((wing, i) => {
                            wing.rotation.z = Math.sin(animal.userData.animationPhase + i * Math.PI) * 0.5;
                        });
                    }
                });
            }
        }
    }
}