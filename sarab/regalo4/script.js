// Registrar plugins de GSAP de manera segura
const pluginsToRegister = [];
if (typeof Draggable !== "undefined") pluginsToRegister.push(Draggable);
if (typeof Flip !== "undefined") pluginsToRegister.push(Flip);
if (typeof InertiaPlugin !== "undefined") pluginsToRegister.push(InertiaPlugin);
if (typeof CustomEase !== "undefined") pluginsToRegister.push(CustomEase);

if (typeof gsap !== "undefined") {
  gsap.registerPlugin(...pluginsToRegister);
}

class PreloaderManager {
  constructor() {
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.startTime = null;
    this.duration = 2000;
    this.createLoadingScreen();
  }

  createLoadingScreen() {
    this.overlay = document.getElementById("preloader-overlay");
    if (!this.overlay) return;
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100000;
    `;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 300;
    this.canvas.height = 300;

    this.ctx = this.canvas.getContext("2d");
    this.overlay.appendChild(this.canvas);
    this.startAnimation();
  }

  startAnimation() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    let time = 0;
    let lastTime = 0;

    const dotRings = [
      { radius: 20, count: 8 },
      { radius: 35, count: 12 },
      { radius: 50, count: 16 },
      { radius: 65, count: 20 },
      { radius: 80, count: 24 }
    ];

    const colors = { primary: "#2C1B14", accent: "#A64B23" };
    const hexToRgb = (hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];

    const animate = (timestamp) => {
      if (!this.startTime) this.startTime = timestamp;
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      time += deltaTime * 0.001;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      const rgb = hexToRgb(colors.primary);
      this.ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`;
      this.ctx.fill();

      dotRings.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.count; i++) {
          const angle = (i / ring.count) * Math.PI * 2;
          const radiusPulse = Math.sin(time * 2 - ringIndex * 0.4) * 3;
          const x = centerX + Math.cos(angle) * (ring.radius + radiusPulse);
          const y = centerY + Math.sin(angle) * (ring.radius + radiusPulse);

          const opacityWave = 0.4 + Math.sin(time * 2 - ringIndex * 0.4 + i * 0.2) * 0.6;
          const isActive = Math.sin(time * 2 - ringIndex * 0.4 + i * 0.2) > 0.6;

          this.ctx.beginPath();
          this.ctx.moveTo(centerX, centerY);
          this.ctx.lineTo(x, y);
          this.ctx.lineWidth = 0.8;

          if (isActive) {
            const accentRgb = hexToRgb(colors.accent);
            this.ctx.strokeStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${opacityWave * 0.7})`;
          } else {
            const primaryRgb = hexToRgb(colors.primary);
            this.ctx.strokeStyle = `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${opacityWave * 0.5})`;
          }
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          if (isActive) {
            const accentRgb = hexToRgb(colors.accent);
            this.ctx.fillStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${opacityWave})`;
          } else {
            const primaryRgb = hexToRgb(colors.primary);
            this.ctx.fillStyle = `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, ${opacityWave})`;
          }
          this.ctx.fill();
        }
      });

      if (timestamp - this.startTime >= this.duration) {
        this.complete();
        return;
      }
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  complete(onComplete) {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.overlay) {
      this.overlay.style.opacity = "0";
      this.overlay.style.transition = "opacity 0.8s ease";
      setTimeout(() => {
        this.overlay?.remove();
        if (onComplete) onComplete();
      }, 800);
    }
  }
}

class FashionGallery {
  constructor() {
    this.viewport = document.getElementById("viewport");
    this.canvasWrapper = document.getElementById("canvasWrapper");
    this.gridContainer = document.getElementById("gridContainer");
    this.controlsContainer = document.getElementById("controlsContainer");
    this.soundToggle = document.getElementById("soundToggle");

    this.customEase = (typeof CustomEase !== "undefined") ? CustomEase.create("smooth", ".87,0,.13,1") : "power2.inOut";
    this.centerEase = (typeof CustomEase !== "undefined") ? CustomEase.create("center", ".25,.46,.45,.94") : "power2.out";

    this.config = {
      itemSize: 320,
      baseGap: 16,
      rows: 8,
      cols: 12,
      currentZoom: 0.6, // Iniciamos al 60% por el comportamiento de tu demo
      currentGap: 32
    };

    this.zoomState = { isActive: false, selectedItem: null };
    this.gridItems = [];
    this.gridDimensions = {};
    this.lastValidPosition = { x: 0, y: 0 };
    this.draggable = null;

    this.initSoundSystem();
    this.initImageData();
  }

  initSoundSystem() {
    this.soundSystem = {
      enabled: false,
      sounds: {
        click: new Audio("https://codepen.io"),
        "zoom-in": new Audio("https://codepen.io"),
        "zoom-out": new Audio("https://codepen.io"),
        "drag-start": new Audio("https://codepen.io"),
        "drag-end": new Audio("https://codepen.io")
      },
      play: (soundName) => {
        if (!this.soundSystem.enabled || !this.soundSystem.sounds[soundName]) return;
        try {
          const audio = this.soundSystem.sounds[soundName];
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } catch (e) {}
      },
      toggle: () => {
        this.soundSystem.enabled = !this.soundSystem.enabled;
        this.soundToggle.classList.toggle("active", this.soundSystem.enabled);
      }
    };
  }

  initImageData() {
    const NEGRA = "https://i.postimg.cc/T3sb4vTh/000000.png";
    const CORAZON = "https://i.postimg.cc/5N6NkYy7/heart-shaped-love-icon-symbol-for-pictogram-art-illustration-apps-website-valentines-day-logo-or-gra.jpg";

    this.fashionImages = [
      // ================= FILA 1: NUEVA FILA VACÍA DE DESPLAZAMIENTO =================
      CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON,

      // ================= FILA 2: "FELIZ" (Desplazada de Fila 1) =================
      CORAZON, CORAZON, CORAZON,
      "https://i.postimg.cc/zvVG7WmJ/image-37ff72db.jpg", 
      "https://i.postimg.cc/wM7j2JKT/image-b1f4231a.jpg", 
      "https://i.postimg.cc/CxFj0hqZ/letra-l.jpg", 
      "https://i.postimg.cc/pXV6Jz0Z/letra-i.jpg", 
      "https://i.postimg.cc/28d4gb3K/letra-z.jpg", 
      CORAZON, CORAZON, CORAZON, CORAZON,

      // ================= FILA 3: "CUMPLEAÑOS" (Desplazada de Fila 2) =================
      CORAZON,
      "https://i.postimg.cc/pL2DvWFY/letra-c.jpg", 
      "https://i.postimg.cc/3Jjgz4d7/letra-u.jpg", 
      "https://i.postimg.cc/x10KQfzc/letra-m.jpg", 
      "https://i.postimg.cc/bN0Q4DsD/letra-p.jpg", 
      "https://i.postimg.cc/CxFj0hqZ/letra-l.jpg", 
      "https://i.postimg.cc/2Sz4YkZ4/letra-e.jpg", 
      "https://i.postimg.cc/Jz1b8rkQ/letra-a.jpg", 
      "https://i.postimg.cc/GmckRLy3/letra-n.jpg", 
      "https://i.postimg.cc/8PdhxJjr/letra-o.jpg", 
      "https://i.postimg.cc/xTGKBJck/letra-s.jpg", 
      CORAZON,

      // ================= FILA 4: "TE AMO" (Desplazada de Fila 3) =================
      CORAZON, CORAZON, CORAZON,
      "https://i.postimg.cc/9FPGsRr2/letra-t.jpg", 
      "https://i.postimg.cc/2Sz4YkZ4/letra-e.jpg", 
      NEGRA,                                         
      "https://i.postimg.cc/Jz1b8rkQ/letra-a.jpg", 
      "https://i.postimg.cc/x10KQfzc/letra-m.jpg", 
      "https://i.postimg.cc/8PdhxJjr/letra-o.jpg", 
      CORAZON, CORAZON, CORAZON, 

      // ================= FILA 5: Separación central (Desplazada de Fila 4) =================
      NEGRA, NEGRA, NEGRA, NEGRA, NEGRA, NEGRA, NEGRA, NEGRA, NEGRA, NEGRA, NEGRA, NEGRA,

      // ================= FILA 6: "DISFRUTA" (Desplazada de Fila 5) =================
      CORAZON, CORAZON,
      "https://i.postimg.cc/P5tmHXwb/letra-d.jpg", 
      "https://i.postimg.cc/pXV6Jz0Z/letra-i.jpg", 
      "https://i.postimg.cc/xTGKBJck/letra-s.jpg", 
      "https://i.postimg.cc/L8HzS911/letra-f.jpg", 
      "https://i.postimg.cc/pXQD3hpV/letra-r.jpg", 
      "https://i.postimg.cc/3Jjgz4d7/letra-u.jpg", 
      "https://i.postimg.cc/9FPGsRr2/letra-t.jpg", 
      "https://i.postimg.cc/Jz1b8rkQ/letra-a.jpg", 
      CORAZON, CORAZON,

      // ================= FILA 7: "ESTE DIA" (Desplazada de Fila 6) =================
      CORAZON, CORAZON,
      "https://i.postimg.cc/2Sz4YkZ4/letra-e.jpg", 
      "https://i.postimg.cc/xTGKBJck/letra-s.jpg", 
      "https://i.postimg.cc/9FPGsRr2/letra-t.jpg", 
      "https://i.postimg.cc/2Sz4YkZ4/letra-e.jpg", 
      NEGRA,                                         
      "https://i.postimg.cc/P5tmHXwb/letra-d.jpg", 
      "https://i.postimg.cc/pXV6Jz0Z/letra-i.jpg", 
      "https://i.postimg.cc/Jz1b8rkQ/letra-a.jpg", 
      CORAZON, CORAZON,

      // ================= FILA 8: Relleno inferior de cierre (Desplazada de Filas 7/8) =================
      CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON, CORAZON
    ];
  }

  calculateGapForZoom(zoomLevel) {
    if (zoomLevel >= 1.0) return 16;
    else if (zoomLevel >= 0.6) return 32;
    else return 64;
  }

  calculateGridDimensions(gap = this.config.currentGap) {
    const totalWidth = this.config.cols * (this.config.itemSize + gap) - gap;
    const totalHeight = this.config.rows * (this.config.itemSize + gap) - gap;
    this.gridDimensions = {
      width: totalWidth,
      height: totalHeight,
      scaledWidth: totalWidth * this.config.currentZoom,
      scaledHeight: totalHeight * this.config.currentZoom,
      gap: gap
    };
    return this.gridDimensions;
  }

    generateGridItems() {
    this.config.currentGap = this.calculateGapForZoom(this.config.currentZoom);
    this.calculateGridDimensions();
    this.canvasWrapper.style.width = this.gridDimensions.width + "px";
    this.canvasWrapper.style.height = this.gridDimensions.height + "px";
    this.gridContainer.innerHTML = "";
    this.gridItems = [];

    let index = 0;
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        const item = document.createElement("div");
        item.className = "grid-item";

        const x = col * (this.config.itemSize + this.config.currentGap);
        const y = row * (this.config.itemSize + this.config.currentGap);

        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        item.style.opacity = "0";

        const imageUrl = this.fashionImages[index % this.fashionImages.length];
        index++;

        // Inyectar la etiqueta de imagen de forma obligatoria borrando el pasado
        const img = document.createElement("img");
        img.src = imageUrl;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.pointerEvents = "none";
        item.appendChild(img);

        item.style.pointerEvents = "auto";
        item.style.cursor = "grab";

        this.gridContainer.appendChild(item);
        this.gridItems.push({ element: item, baseX: x, baseY: y });
      }
    }
  }


  initDraggable() {
    if (this.draggable) this.draggable.kill();
    this.calculateGridDimensions(this.config.currentGap);
    
    const bounds = this.calculateBounds();
    const hasInertia = typeof InertiaPlugin !== "undefined";

    this.draggable = Draggable.create(this.canvasWrapper, {
      type: "x,y",
bounds: bounds,
edgeResistance: 0.8,
inertia: hasInertia,
onDragStart: () => {
document.body.classList.add("dragging");
this.soundSystem.play("drag-start");
},
onDragEnd: () => {
document.body.classList.remove("dragging");
this.soundSystem.play("drag-end");
}
})[0];
}
calculateBounds() {
const vw = window.innerWidth;
const vh = window.innerHeight;
const { scaledWidth, scaledHeight } = this.gridDimensions;
const marginX = this.config.currentGap * this.config.currentZoom;
const marginY = this.config.currentGap * this.config.currentZoom;
let minX = scaledWidth <= vw ? (vw - scaledWidth) / 2 : vw - scaledWidth - marginX;
let maxX = scaledWidth <= vw ? (vw - scaledWidth) / 2 : marginX;
let minY = scaledHeight <= vh ? (vh - scaledHeight) / 2 : vh - scaledHeight - marginY;
let maxY = scaledHeight <= vh ? (vh - scaledHeight) / 2 : marginY;
return { minX, maxX, minY, maxY };
}
playIntroAnimation() {
this.gridItems.forEach((item) => {
gsap.set(item.element, { scale: 1, opacity: 1 });
});
gsap.from(this.gridItems.map(i => i.element), {
duration: 0.6,
scale: 0.5,
opacity: 0,
ease: "power2.out",
stagger: { amount: 1, grid: [this.config.rows, this.config.cols] }
});
}
autoFitZoom() {
this.config.currentZoom = 0.2; // Zoom total alejado para mostrar todo
this.setZoom(0.2);
}
updatePercentageIndicator(zoomLevel) {
const percentage = Math.round(zoomLevel * 100);
const indicator = document.getElementById("percentageIndicator");
if (indicator) indicator.textContent = ${percentage}%;
}
setZoom(zoomLevel) {
const newGap = this.calculateGapForZoom(zoomLevel);
this.config.currentZoom = zoomLevel;
this.config.currentGap = newGap;
this.calculateGridDimensions(newGap);
const vw = window.innerWidth;
const vh = window.innerHeight;
const finalCenterX = (vw - this.gridDimensions.scaledWidth) / 2;
const finalCenterY = (vh - this.gridDimensions.scaledHeight) / 2;
this.gridItems.forEach((item, idx) => {
const col = idx % this.config.cols;
const row = Math.floor(idx / this.config.cols);
const newX = col * (this.config.itemSize + newGap);
const newY = row * (this.config.itemSize + newGap);
gsap.to(item.element, { duration: 0.8, left: newX, top: newY, ease: this.customEase });
});
gsap.to(this.canvasWrapper, {
duration: 0.8,
scale: zoomLevel,
x: finalCenterX,
y: finalCenterY,
width: this.gridDimensions.width,
height: this.gridDimensions.height,
ease: this.customEase,
onComplete: () => this.initDraggable()
});
this.updatePercentageIndicator(zoomLevel);
}
init() {
this.generateGridItems();
gsap.set(this.viewport, { opacity: 1 });
const vw = window.innerWidth;
const vh = window.innerHeight;
const centerX = (vw - this.gridDimensions.scaledWidth) / 2;
const centerY = (vh - this.gridDimensions.scaledHeight) / 2;
gsap.set(this.canvasWrapper, { scale: this.config.currentZoom, x: centerX, y: centerY });
this.updatePercentageIndicator(this.config.currentZoom);
this.setupEventListeners();
this.playIntroAnimation();
setTimeout(() => this.initDraggable(), 1000);
}
setupEventListeners() {
document.addEventListener("keydown", (e) => {
const instructions = document.getElementById("zoomInstructions");
switch (e.key) {
case "2":
this.setZoom(0.6);
if (instructions) instructions.innerHTML = "APRETA EN EL SIGUIENTE ORDEN: 2, [1], F";
break;
case "1":
this.setZoom(1.0);
if (instructions) instructions.innerHTML = "APRETA EN EL SIGUIENTE ORDEN: 2, 1, [F]";
break;
case "f":
case "F":
this.autoFitZoom();
if (instructions) instructions.innerHTML = "¡ORDEN COMPLETADO! (Presiona 2 para reiniciar)";
break;
}
});
}
}
document.addEventListener("DOMContentLoaded", () => {
const preloader = new PreloaderManager();
setTimeout(() => {
preloader.complete(() => {
const gallery = new FashionGallery();
gallery.init();
});
}, 2000);
});
