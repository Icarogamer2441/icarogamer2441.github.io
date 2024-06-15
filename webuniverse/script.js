let particles = [];
let canvas;
let gravity = 15; // variável para controlar a força de gravidade
let attractDistance = 250; // distância de atração entre as partículas

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');
}

function draw() {
    background(0);
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].checkEdges();
        for (let j = i + 1; j < particles.length; j++) {
            particles[i].attract(particles[j]);
            particles[i].collide(particles[j]); // mantendo a função collide
        }
        particles[i].show();
    }
}

function mouseDragged() {
    particles.push(new Particle(mouseX, mouseY));
}

function keyPressed() {
    if (key === 'a' || key === 'A') {
        gravity++;
        console.log("Gravity increased to: " + gravity);
    } else if (key === 's' || key === 'S') {
        if (gravity > 1) {
            gravity--;
            console.log("Gravity decreased to: " + gravity);
        }
    }
}

class Particle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-1, 1), random(-1, 1));
        this.acc = createVector(0, 0);
        this.mass = 1; // Fixing mass to 1
        this.radius = 10; // Fixing radius to 10 pixels
    }

    applyForce(force) {
        let f = p5.Vector.div(force, this.mass);
        this.acc.add(f);
    }

    attract(other) {
        let force = p5.Vector.sub(other.pos, this.pos);
        let distance = force.mag();

        if (distance < attractDistance) {
            let distanceSq = constrain(force.magSq(), 100, 500);
            let G = gravity; // Utilizando a variável gravity aqui
            let strength = (G * (this.mass * other.mass)) / distanceSq;
            force.setMag(strength);
            this.applyForce(force);
        }
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.set(0, 0);
    }

    checkEdges() {
        if (this.pos.x > width - this.radius) {
            this.pos.x = width - this.radius;
            this.vel.x *= -1;
        } else if (this.pos.x < this.radius) {
            this.pos.x = this.radius;
            this.vel.x *= -1;
        }

        if (this.pos.y > height - this.radius) {
            this.pos.y = height - this.radius;
            this.vel.y *= -1;
        } else if (this.pos.y < this.radius) {
            this.pos.y = this.radius;
            this.vel.y *= -1;
        }
    }

    collide(other) {
        let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
        let minDist = this.radius + other.radius;

        if (d < minDist) {
            let overlap = (minDist - d) / 2;
            let direction = p5.Vector.sub(other.pos, this.pos).normalize();

            this.pos.sub(direction.copy().mult(overlap));
            other.pos.add(direction.copy().mult(overlap));

            this.vel.mult(0.95);
            other.vel.mult(0.95);
        }
    }

    show() {
        noStroke();
        fill(255);
        ellipse(this.pos.x, this.pos.y, this.radius * 2);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
