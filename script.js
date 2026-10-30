const mathUtils = {
  easeOutCubic: t => --t * t * t + 1
};

window.onload = () => {
  const navMain = [...document.querySelectorAll(".nav-main li")];
  let currentIndex = 0;
  let lastIndex = 0;
  let textureActive = "";
  let nextTexture = "";
  let start = performance.now();
  let progress = false;

  const createCanvas = () => {
    const shader = {
      vertex: `
        #ifdef GL_ES
        precision mediump float;
        #endif
        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform mat4 textureActiveMatrix;
        uniform mat4 nextTextureMatrix;
        varying vec3 vVertexPosition;
        varying vec2 vTextureActiveCoord;
        varying vec2 vNextTextureCoord;
        void main() {
            vec3 vertexPosition = aVertexPosition;
            gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);
            vTextureActiveCoord = (textureActiveMatrix * vec4(aTextureCoord, 0., 1.)).xy;
            vNextTextureCoord = (nextTextureMatrix * vec4(aTextureCoord, 0., 1.)).xy;
            vVertexPosition = vertexPosition;
        }`,
      fragment: `
        #ifdef GL_ES
        precision mediump float;
        #endif
        #define PI2 6.28318530718
        #define PI 3.14159265359
        #define TWO_PI 6.28318530718
        #define S(a,b,n) smoothstep(a,b,n)
        varying vec3 vVertexPosition;
        varying vec2 vTextureActiveCoord;
        varying vec2 vNextTextureCoord;
        uniform float uProgress;
        uniform sampler2D textureActive;
        uniform sampler2D nextTexture;
        uniform sampler2D displacementMap;
        void main(){
            vec2 uv0 = vTextureActiveCoord;
            vec2 uv1 = vNextTextureCoord;
            float progress0 = uProgress;
            float progress1 = 1. - uProgress;
            vec4 disp0 = texture2D(textureActive, uv0);
            vec4 disp1 = texture2D(nextTexture, uv1);
            float t0 = progress0 * (disp0.r * .3) * 2.;
            float t1 = progress1 * (disp1.r * .3) * 2.;
            vec4 color0 = texture2D(textureActive, vec2(uv0.x, uv0.y + t1)) * progress1;
            vec4 color1 = texture2D(nextTexture, vec2(uv1.x, uv1.y - t1)) * progress0;
            gl_FragColor = color0 + color1;
        }`
    };

    const webGLCurtain = new Curtains("canvas");
    const planeElement = document.getElementsByClassName("plane")[0];
    const params = {
      vertexShader: shader.vertex,
      fragmentShader: shader.fragment,
      widthSegments: 40,
      heightSegments: 40,
      uniforms: {
        progress: {
          name: "uProgress",
          type: "1f",
          value: 0
        }
      }
    };
    webGLCurtain.disableDrawing();
    const plane = webGLCurtain.addPlane(planeElement, params);
    
    plane.onReady(() => {
        webGLCurtain.needRender();
        textureActive = plane.createTexture("textureActive");
        nextTexture = plane.createTexture("nextTexture");
        
        textureActive.setSource(plane.images[currentIndex]);
        initEvents(webGLCurtain, plane);
      })
      .onRender(() => {
        update(webGLCurtain, plane);
      });
  };
   
  lastIndex = 0
  const update = (webGLCurtain, plane) => {
    if (progress) {
      const now = performance.now();
      const time = Math.min(1, (now - start) / 800);
      
      plane.uniforms.progress.value = mathUtils.easeOutCubic(time);

      if (time >= 1) {
        webGLCurtain.disableDrawing();
        textureActive.setSource(plane.images[currentIndex]);
        progress = false
      }
    }
  };

  const onMouseOver = (webGLCurtain, plane, index) => {
    if(index === currentIndex) return 
    webGLCurtain.enableDrawing();
    currentIndex = index;
    nextTexture.setSource(plane.images[currentIndex]);
    progress = true;
    start = performance.now();
  };

    const initEvents = (webGLCurtain, plane) => {
    navMain.forEach((li, i) => {
      // Evento para computadoras (Mouse)
      li.addEventListener("mouseenter", () => {
        onMouseOver(webGLCurtain, plane, i);
      });
      
      // Evento para Celulares (Dedo)
      li.addEventListener("touchstart", () => {
        onMouseOver(webGLCurtain, plane, i);
      }, {passive: true});

      // ESTE ES EL FRAGMENTO NUEVO QUE DEBES REMPLAZAR:
      li.addEventListener("click", function() {
        const destino = this.getAttribute("data-link");
        if (destino) {
          if (destino.startsWith("http://") || destino.startsWith("https://")) {
            // Abre Google Drive en pestaña nueva
            window.open(destino, "_blank");
          } else {
            // Espera a que termine la distorsión del fondo (800ms) y redirige
            setTimeout(() => {
              window.location.href = destino;
            }, 800);
          }
        }
      });
    });
  };


  const animateNav = () => {
    TweenMax.staggerFrom(
      navMain,
      0.8,
      {
        opacity: 0,
        y: 200,
        ease: Power2.easeOut
      },
      0.2
    );
  };

  animateNav();
  createCanvas();
};
