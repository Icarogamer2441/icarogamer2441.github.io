// JSVival API for mods
const JSV = {
    api: {
        modname: "",
        modversion: "",
        moddescription: "",
        modauthor: "",
        active: true, // Default to true
        gameloop: null,

        // Utility function to check if API calls should proceed
        _checkActive: function() {
            return this.active !== false; // If active is undefined or true, return true
        },

        // Player related functions
        get_player_position: function() {
            if (!this._checkActive()) return null;
            return { x: player.x, y: player.y, z: player.z };
        },

        get_player_health: function() {
            if (!this._checkActive()) return null;
            return player.health;
        },

        // Entity related functions
        get_nearest_entity: function() {
            if (!this._checkActive()) return null;
            let nearest = null;
            let minDistance = Infinity;
            
            // Get player chunk coordinates
            const playerChunkX = Math.floor(player.x / chunkSize);
            const playerChunkZ = Math.floor(player.z / chunkSize);
            
            // Check nearby chunks
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    const chunkKey = `${playerChunkX + x},${playerChunkZ + z}`;
                    const chunkAnimals = animalsInChunks.get(chunkKey);
                    
                    if (chunkAnimals && chunkAnimals.children) {
                        // Iterate through the THREE.Group's children
                        chunkAnimals.children.forEach(animal => {
                            if (animal && animal.position) {
                                const distance = Math.sqrt(
                                    Math.pow(animal.position.x - player.x, 2) +
                                    Math.pow(animal.position.z - player.z, 2)
                                );
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    nearest = animal;
                                }
                            }
                        });
                    }
                }
            }
            
            return nearest;
        },

        // Entity management functions
        delete_entity: function(entity) {
            if (!this._checkActive()) return;
            if (!entity || !entity.parent) return;

            // Remove from scene
            entity.parent.remove(entity);

            // Find and remove from chunk data
            const chunkX = Math.floor(entity.position.x / chunkSize);
            const chunkZ = Math.floor(entity.position.z / chunkSize);
            const chunkKey = `${chunkX},${chunkZ}`;
            
            const chunkAnimals = animalsInChunks.get(chunkKey);
            if (chunkAnimals && chunkAnimals.children) {
                const index = chunkAnimals.children.indexOf(entity);
                if (index !== -1) {
                    chunkAnimals.children.splice(index, 1);
                }
            }

            // Dispose of geometries and materials to free memory
            if (entity.geometry) entity.geometry.dispose();
            if (entity.material) {
                if (Array.isArray(entity.material)) {
                    entity.material.forEach(m => m.dispose());
                } else {
                    entity.material.dispose();
                }
            }
        },

        get_player_entity: function() {
            if (!this._checkActive()) return null;
            return camera;
        },

        // Utility functions
        get_distance: function(pos1, pos2) {
            if (!this._checkActive()) return Infinity;
            if (!pos1 || !pos2) return Infinity;
            return Math.sqrt(
                Math.pow(pos1.x - pos2.x, 2) +
                Math.pow(pos1.z - pos2.z, 2)
            );
        },

        // Chat functions
        send_message: function(message) {
            if (!this._checkActive()) return;
            if (typeof chatSystem !== 'undefined') {
                chatSystem.addMessage(message);
            }
        },

        // Register mod events
        on_player_move: null,
        on_entity_spawn: null,
        on_chat_message: null,

        // Shape management
        shapes: {
            sphere: function(radius) {
                return new THREE.SphereGeometry(radius, 32, 32);
            },
            // Add more shapes as needed (cube, cylinder, etc.)
        },

        // Shape and entity storage
        _shapes: new Map(),
        _entities: new Map(),
        _entityUpdateCallbacks: new Map(),

        new_shape: function(geometry, name) {
            if (!this._checkActive()) return;
            this._shapes.set(name, geometry);
        },

        set_shape_color: function(name, color) {
            if (!this._checkActive()) return;
            if (!this._shapes.has(name)) return;
            
            // Create material with the specified color
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                metalness: 0.3,
                roughness: 0.7
            });
            
            // Store the material with the geometry
            this._shapes.set(name, {
                geometry: this._shapes.get(name),
                material: material
            });
        },

        get_terrain_height: function(x, z) {
            return getTerrainData(x, z);
        },

        _checkTerrainCollision: function(entity, newPosition) {
            if (!entity) return { collision: false, height: 0 };

            // Get base terrain height at entity position
            const { height: baseHeight } = getTerrainData(newPosition.x, newPosition.z);
            
            if (entity.userData.collision_radius) {
                // For circular entities, check multiple points around the radius
                let maxHeight = baseHeight;
                const radius = entity.userData.collision_radius;
                const points = 8; // Number of points to check around the circle
                
                for (let i = 0; i < points; i++) {
                    const angle = (i / points) * Math.PI * 2;
                    const checkX = newPosition.x + Math.cos(angle) * radius;
                    const checkZ = newPosition.z + Math.sin(angle) * radius;
                    const { height } = getTerrainData(checkX, checkZ);
                    maxHeight = Math.max(maxHeight, height);
                }
                
                return {
                    collision: newPosition.y < maxHeight,
                    height: maxHeight
                };
            } 
            else if (entity.userData.collision_size) {
                // For box entities, check corners and center
                const size = entity.userData.collision_size;
                let maxHeight = baseHeight;
                const halfX = size.x / 2;
                const halfZ = size.z / 2;
                
                // Check all corners and center
                const checkPoints = [
                    {x: newPosition.x - halfX, z: newPosition.z - halfZ},
                    {x: newPosition.x - halfX, z: newPosition.z + halfZ},
                    {x: newPosition.x + halfX, z: newPosition.z - halfZ},
                    {x: newPosition.x + halfX, z: newPosition.z + halfZ},
                    {x: newPosition.x, z: newPosition.z} // Center
                ];
                
                for (const point of checkPoints) {
                    const { height } = getTerrainData(point.x, point.z);
                    maxHeight = Math.max(maxHeight, height);
                }
                
                return {
                    collision: newPosition.y < maxHeight,
                    height: maxHeight
                };
            }
            
            // Default collision check for entities without collision shape
            return {
                collision: newPosition.y < baseHeight,
                height: baseHeight
            };
        },

        _checkEntityCollision: function(entity1, pos1, entity2, pos2) {
            if (!entity1 || !entity2) return false;
            
            // Get collision shapes
            const shape1 = entity1.userData.collision_radius ? 'circle' : 
                          entity1.userData.collision_size ? 'box' : null;
            const shape2 = entity2.userData.collision_radius ? 'circle' : 
                          entity2.userData.collision_size ? 'box' : null;
            
            if (!shape1 || !shape2) return false;

            // Circle vs Circle
            if (shape1 === 'circle' && shape2 === 'circle') {
                const dist = Math.sqrt(
                    Math.pow(pos1.x - pos2.x, 2) +
                    Math.pow(pos1.z - pos2.z, 2)
                );
                return dist < (entity1.userData.collision_radius + entity2.userData.collision_radius);
            }
            
            // Box vs Box
            if (shape1 === 'box' && shape2 === 'box') {
                const size1 = entity1.userData.collision_size;
                const size2 = entity2.userData.collision_size;
                return Math.abs(pos1.x - pos2.x) < (size1.x + size2.x) / 2 &&
                       Math.abs(pos1.z - pos2.z) < (size1.z + size2.z) / 2;
            }
            
            // Circle vs Box
            const circle = shape1 === 'circle' ? entity1 : entity2;
            const box = shape1 === 'circle' ? entity2 : entity1;
            const circlePos = shape1 === 'circle' ? pos1 : pos2;
            const boxPos = shape1 === 'circle' ? pos2 : pos1;
            
            const halfSize = {
                x: box.userData.collision_size.x / 2,
                z: box.userData.collision_size.z / 2
            };
            
            // Find closest point on box to circle center
            const closest = {
                x: Math.max(boxPos.x - halfSize.x, Math.min(circlePos.x, boxPos.x + halfSize.x)),
                z: Math.max(boxPos.z - halfSize.z, Math.min(circlePos.z, boxPos.z + halfSize.z))
            };
            
            const dist = Math.sqrt(
                Math.pow(circlePos.x - closest.x, 2) +
                Math.pow(circlePos.z - closest.z, 2)
            );
            
            return dist < circle.userData.collision_radius;
        },

        _handleEntityCollision: function(entity1, entity2) {
            if (!entity1 || !entity2) return;

            // Calculate collision response
            const dx = entity2.position.x - entity1.position.x;
            const dz = entity2.position.z - entity1.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist === 0) return; // Prevent division by zero

            const nx = dx / dist;
            const nz = dz / dist;

            // Handle pushing mechanics
            if (entity2 === camera && entity1.userData.can_push) { // Player pushing entity
                const pushForce = 0.1;
                entity1.userData.velocity.x -= nx * pushForce;
                entity1.userData.velocity.z -= nz * pushForce;
            } else if (entity1.userData.can_push) { // Entity pushing other entity
                const pushForce = 0.05;
                entity2.userData.velocity.x += nx * pushForce;
                entity2.userData.velocity.z += nz * pushForce;
            }

            // Basic separation
            const separation = 0.1;
            entity1.position.x -= nx * separation;
            entity1.position.z -= nz * separation;
            
            if (entity2 !== camera) {
                entity2.position.x += nx * separation;
                entity2.position.z += nz * separation;
            }
        },

        _checkPlayerCollision: function(entity, newPosition) {
            if (!entity || !entity.userData.collide_other_entities) return false;
            
            const dist = Math.sqrt(
                Math.pow(newPosition.x - player.x, 2) +
                Math.pow(newPosition.z - player.z, 2)
            );

            const totalRadius = (entity.userData.collision_radius || 1) + (player.collision_radius || 1);
            return dist < totalRadius;
        },

        _handlePlayerCollision: function(entity, newPosition) {
            // Calculate collision vector
            const dx = newPosition.x - player.x;
            const dz = newPosition.z - player.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist === 0) return;

            const nx = dx / dist;
            const nz = dz / dist;

            // Handle pushing
            if (player.can_push && entity.userData.can_push) {
                // Player's movement affects entity velocity
                const pushForce = 0.2;
                
                // Calculate player's movement direction
                const playerMovement = new THREE.Vector3();
                if (keysPressed['w'] || keysPressed['W']) playerMovement.z -= 1;
                if (keysPressed['s'] || keysPressed['S']) playerMovement.z += 1;
                if (keysPressed['a'] || keysPressed['A']) playerMovement.x -= 1;
                if (keysPressed['d'] || keysPressed['D']) playerMovement.x += 1;
                
                if (playerMovement.length() > 0) {
                    playerMovement.normalize();
                    entity.userData.velocity.x += playerMovement.x * pushForce;
                    entity.userData.velocity.z += playerMovement.z * pushForce;
                }
            }

            // Prevent overlap
            const separation = (entity.userData.collision_radius || 1) + (player.collision_radius || 1);
            const overlap = separation - dist;
            
            if (overlap > 0) {
                // Move both the entity and player apart
                const pushRatio = 0.5; // How much each object moves (0.5 = equal)
                
                // Move entity
                entity.position.x += nx * overlap * pushRatio;
                entity.position.z += nz * overlap * pushRatio;
                
                // Move player
                player.x -= nx * overlap * (1 - pushRatio);
                player.z -= nz * overlap * (1 - pushRatio);
            }
        },

        create_entity: function(shapeName, entityName) {
            if (!this._checkActive()) return null;
            const shape = this._shapes.get(shapeName);
            if (!shape) return null;

            // Create mesh with geometry and material
            const mesh = new THREE.Mesh(
                shape.geometry || shape,
                shape.material || new THREE.MeshStandardMaterial({ color: 0xffffff })
            );

            // Set up entity properties
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = {
                active: false,
                gravity: false,
                velocity: new THREE.Vector3(0, 0, 0),
                gravityForce: 0.015,
                collide_other_entities: false,
                can_push: false
            };

            // Define getters and setters for active and gravity
            Object.defineProperties(mesh, {
                'active': {
                    get: function() {
                        return this.userData.active;
                    },
                    set: function(value) {
                        this.userData.active = value;
                        if (!value) {
                            this.userData.velocity.set(0, 0, 0);
                        }
                    }
                },
                'gravity': {
                    get: function() {
                        return this.userData.gravity;
                    },
                    set: function(value) {
                        this.userData.gravity = value;
                        if (!value) {
                            this.userData.velocity.y = 0;
                        }
                    }
                }
            });

            // Add to scene
            scene.add(mesh);
            this._entities.set(entityName, mesh);

            // Set up update callback for physics
            this._entityUpdateCallbacks.set(entityName, () => {
                if (mesh.userData.active) {
                    // Apply gravity if enabled
                    if (mesh.userData.gravity) {
                        mesh.userData.velocity.y -= mesh.userData.gravityForce;
                    }

                    // Calculate new position
                    const newPosition = mesh.position.clone().add(mesh.userData.velocity);

                    // Check terrain collision with collision shape
                    const collision = this._checkTerrainCollision(mesh, newPosition);

                    // Check entity collisions if enabled
                    if (mesh.userData.collide_other_entities) {
                        for (const [_, otherEntity] of this._entities) {
                            if (otherEntity !== mesh && 
                                otherEntity.userData.collide_other_entities &&
                                this._checkEntityCollision(mesh, newPosition, otherEntity, otherEntity.position)) {
                                this._handleEntityCollision(mesh, otherEntity);
                            }
                        }

                        // Check player collision
                        if (this._checkEntityCollision(mesh, newPosition, camera, camera.position)) {
                            this._handleEntityCollision(mesh, camera);
                        }
                    }
                    
                    // Check player collision if enabled
                    const playerCollision = this._checkPlayerCollision(mesh, newPosition);
                    
                    if (playerCollision) {
                        this._handlePlayerCollision(mesh, newPosition);
                    }
                    
                    // Update position and handle terrain collision
                    mesh.position.copy(newPosition);
                    if (collision.collision) {
                        mesh.position.y = collision.height;
                        
                        // Bounce effect
                        if (mesh.userData.gravity && Math.abs(mesh.userData.velocity.y) > 0.01) {
                            mesh.userData.velocity.y = Math.abs(mesh.userData.velocity.y) * 0.5;
                        } else {
                            mesh.userData.velocity.y = 0;
                        }
                    }
                }
            });

            return mesh;
        },

        get_entity: function(entityName) {
            if (!this._checkActive()) return null;
            return this._entities.get(entityName);
        },

        delete_entity: function(entity) {
            if (!this._checkActive()) return;
            if (!entity) return;

            // Remove from scene
            scene.remove(entity);

            // Remove from entities map
            for (const [name, e] of this._entities.entries()) {
                if (e === entity) {
                    this._entities.delete(name);
                    this._entityUpdateCallbacks.delete(name);
                    break;
                }
            }

            // Clean up resources
            if (entity.geometry) entity.geometry.dispose();
            if (entity.material) {
                if (Array.isArray(entity.material)) {
                    entity.material.forEach(m => m.dispose());
                } else {
                    entity.material.dispose();
                }
            }
        }
    }
};