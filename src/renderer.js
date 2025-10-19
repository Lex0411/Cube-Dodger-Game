const THREE = require('three');

class FallingBlockDodger {
    constructor() {
        this.init();
        this.createScene();
        this.createPlayer();
        this.createBlocks();
        this.createLights();
        this.setupEventListeners();
        this.animate();
        this.updateUI(); 
    }

    init() {
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        
        this.blockSpawnRate = 350;
        this.blockBaseSpeed = 0.08;
        this.currentBlockSpeed = this.blockBaseSpeed;
        this.playerSpeed = 0.12; 
        this.lastSpawnTime = 0;
        this.scoreRate = 10; 
        
        this.blocks = [];
        this.keys = {};
        
        this.previousTime = Date.now();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); 

        const textureLoader = new THREE.TextureLoader();
        
        const colorTexture = textureLoader.load('src/assets/textures/matcaps/Sci-fi_Metal_Walkway_001_basecolor.png');
        const normalTexture = textureLoader.load('src/assets/textures/matcaps/Sci-fi_Metal_Walkway_001_normal.png');
        
        colorTexture.wrapS = THREE.RepeatWrapping;
        colorTexture.wrapT = THREE.RepeatWrapping;
        colorTexture.repeat.set(5, 5);
        
        normalTexture.wrapS = THREE.RepeatWrapping;
        normalTexture.wrapT = THREE.RepeatWrapping;
        normalTexture.repeat.set(5, 5);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, 10, 15); 
        this.camera.lookAt(0, 0, 0);

        this.canvas = document.querySelector('canvas.webgl');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        const floorGeometry = new THREE.PlaneGeometry(20, 30); 
        
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc, 
            roughness: 0.5,
            metalness: 0.8, 
            map: colorTexture, 
            normalMap: normalTexture,
            emissive: 0x000011, 
            emissiveIntensity: 1.0 
        });
        
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -4; 
        this.scene.add(this.floor);
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.7); 
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 15, 10);
        this.scene.add(directionalLight);
    }

    createPlayer() {
        this.playerGeometry = new THREE.BoxGeometry(1, 1, 1); 
        
        this.playerMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.5,
            roughness: 0.2,
            emissive: 0xaa0000 
        });

        this.player = new THREE.Mesh(this.playerGeometry, this.playerMaterial);
        this.player.position.set(0, -3.5, 0);
        this.scene.add(this.player);

        this.playerBox = new THREE.Box3(); 
    }

    createBlocks() {
        const BLOCK_SIZE = 1.0; 
        
        this.blockGeometries = [
            new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
            new THREE.SphereGeometry(BLOCK_SIZE * 0.7, 16, 16),
            new THREE.TorusGeometry(BLOCK_SIZE * 0.5, BLOCK_SIZE * 0.2, 8, 16)
        ];

        const cyanColor = 0x00ffff;
        const cyanEmissive = 0x00aaaa;
        
        this.blockMaterials = [
            new THREE.MeshStandardMaterial({ color: cyanColor, metalness: 0.3, roughness: 0.1, emissive: cyanEmissive }), 
            new THREE.MeshStandardMaterial({ color: cyanColor, metalness: 0.3, roughness: 0.1, emissive: cyanEmissive }), 
            new THREE.MeshStandardMaterial({ color: cyanColor, metalness: 0.3, roughness: 0.1, emissive: cyanEmissive })  
        ];
    }
    
    spawnBlock() {
        const index = Math.floor(Math.random() * this.blockGeometries.length);
        const geometry = this.blockGeometries[index];
        const material = this.blockMaterials[index];

        const block = new THREE.Mesh(geometry, material);
        
        block.position.x = (Math.random() - 0.5) * 12; 
        block.position.y = 15;
        block.position.z = 0; 
        
        block.userData = {
            velocity: new THREE.Vector3(0, -this.currentBlockSpeed, 0),
            angularVelocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05
            )
        };

        this.scene.add(block);
        this.blocks.push(block);
    }

    updateBlocks(deltaTime) {
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            
            block.position.y += block.userData.velocity.y * deltaTime * 60;
            block.rotation.x += block.userData.angularVelocity.x;
            block.rotation.y += block.userData.angularVelocity.y;
            block.rotation.z += block.userData.angularVelocity.z;

            if (block.position.y < -4) {
                this.scene.remove(block);
                this.blocks.splice(i, 1);
                continue;
            }

            this.playerBox.setFromObject(this.player);
            const blockBox = new THREE.Box3().setFromObject(block);

            if (blockBox.intersectsBox(this.playerBox)) {
                this.handleCollision(block, i);
            }
        }
    }

    handleCollision(block, index) {
        this.gameOver = true;
        this.showGameOver();
        
        this.scene.remove(block);
        this.blocks.splice(index, 1);
    }

    updatePlayer(deltaTime) {
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.position.x -= this.playerSpeed * deltaTime * 60;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.position.x += this.playerSpeed * deltaTime * 60;
        }

        this.player.position.x = Math.max(-6, Math.min(6, this.player.position.x));
    }

    addScore(points) {
        this.score += points; 
        this.updateUI();
    }

    updateUI() {
        document.getElementById('score').textContent = `Score: ${Math.floor(this.score)}`;
    }

    showGameOver() {
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('finalScore').textContent = Math.floor(this.score);
    }

    resetGame() {
        this.blocks.forEach(block => this.scene.remove(block));
        this.blocks = [];
        
        this.score = 0;
        this.gameOver = false;
        this.currentBlockSpeed = this.blockBaseSpeed;
        this.blockSpawnRate = 350;
        
        this.player.position.x = 0;
        
        this.updateUI();
        document.getElementById('gameOver').classList.add('hidden');
    }

    setupEventListeners() {
        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            if (event.code === 'KeyP') {
                this.paused = !this.paused;
            }
            
            if (event.code === 'F11') {
                event.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });

        document.getElementById('restart').addEventListener('click', () => {
            this.resetGame();
        });
    }

    animate() {
        const tick = () => {
            const currentTime = Date.now();
            const deltaTime = (currentTime - this.previousTime) / 1000; 
            this.previousTime = currentTime;
            
            if (!this.paused && !this.gameOver) {
                this.updatePlayer(deltaTime);
                this.updateBlocks(deltaTime);
                
                this.addScore(deltaTime * this.scoreRate); 

                if (currentTime - this.lastSpawnTime > this.blockSpawnRate) {
                    this.spawnBlock();
                    this.lastSpawnTime = currentTime;
                }
            }
            
            this.renderer.render(this.scene, this.camera);
            
            window.requestAnimationFrame(tick);
        };
        
        tick();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new FallingBlockDodger();
});