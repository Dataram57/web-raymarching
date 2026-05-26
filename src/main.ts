import fragSrc from "./shaders/renderer.fs.glsl?raw";
import vertSrc from "./shaders/renderer.vs.glsl?raw";

// ================================================================
// #region Constants & Types

const DEG_TO_RAD = Math.PI / 180;

type Vec2 = [number, number];
type Vec3 = [number, number, number];

interface BufferObjects {
  pos: WebGLBuffer;
  inx: WebGLBuffer & { len: number };
}

interface DrawProgram extends WebGLProgram {
  inPos: number;
  iCamPos: WebGLUniformLocation;
  iCamRot: WebGLUniformLocation;
  iTime: WebGLUniformLocation;
  iResolution: WebGLUniformLocation;
}

// #endregion

// ================================================================
// #region Vec3 Math

/** Returns a normalized forward vector from pitch and yaw (in radians). */
const getFPSForward = (pitch: number, yaw: number): Vec3 => [
  Math.cos(pitch) * Math.cos(yaw),
  Math.sin(pitch),
  Math.cos(pitch) * Math.sin(yaw),
];

const cloneVec3 = (v: Vec3): Vec3 => [v[0], v[1], v[2]];

const scaleVec3 = (v: Vec3, scalar: number): Vec3 => {
  v[0] *= scalar;
  v[1] *= scalar;
  v[2] *= scalar;
  return v;
};

const addVec3 = (a: Vec3, b: Vec3): Vec3 => {
  a[0] += b[0];
  a[1] += b[1];
  a[2] += b[2];
  return a;
};

const subtractVec3 = (a: Vec3, b: Vec3): Vec3 => {
  a[0] -= b[0];
  a[1] -= b[1];
  a[2] -= b[2];
  return a;
};

const isZeroVec3 = (v: Vec3): boolean =>
  v[0] === 0 && v[1] === 0 && v[2] === 0;

/** Wraps each component to the range [0, modulo). */
const wrapVec3 = (v: Vec3, modulo: number): Vec3 => {
  v[0] = ((v[0] % modulo) + modulo) % modulo;
  v[1] = ((v[1] % modulo) + modulo) % modulo;
  v[2] = ((v[2] % modulo) + modulo) % modulo;
  return v;
};

/** Keeps rotation values in [0, 360). */
const normalizeRotation = (v: Vec3): Vec3 => wrapVec3(v, 360);

// #endregion

// ================================================================
// #region Keyboard

class KeyboardState {
    private pressed = new Set<string>();

    constructor() {
        window.addEventListener("keydown", (e) => this.pressed.add(e.code));
        window.addEventListener("keyup", (e) => this.pressed.delete(e.code));
    }

    isPressed(code: string): boolean {
        return this.pressed.has(code);
    }
}

// #endregion

// ================================================================
// #region Pointer Lock

const setupPointerLock = (): void => {
  // Normalize browser-specific pointer lock API.
  if (!("pointerLockElement" in document)) {
    console.warn("Pointer lock API not available in this browser.");
  }
};

// #endregion

// ================================================================
// #region Camera State

class Camera {
  position: Vec3 = [1.5, 0.5, 1.5];
  rotation: Vec3 = [0, 0, 0]; // degrees: [yaw, pitch, roll]
  forward: Vec3 = [0, 0, 0];
  left: Vec3 = [0, 0, 0];

  readonly speed = 0.1;
  readonly sensitivity = 0.5;

  update(keyboard: KeyboardState): void {
    const rotRad = cloneVec3(this.rotation);
    scaleVec3(rotRad, DEG_TO_RAD);

    this.forward = getFPSForward(rotRad[1], rotRad[0]);
    this.left = [
      Math.cos(rotRad[0] + Math.PI * 0.5),
      0,
      Math.sin(rotRad[0] + Math.PI * 0.5),
    ];

    const movement: Vec3 = [0, 0, 0];

    if (keyboard.isPressed("KeyW")) addVec3(movement, this.forward);
    if (keyboard.isPressed("KeyS")) subtractVec3(movement, this.forward);
    if (keyboard.isPressed("KeyA")) addVec3(movement, this.left);
    if (keyboard.isPressed("KeyD")) subtractVec3(movement, this.left);
    if (keyboard.isPressed("KeyE")) movement[1] += 1;
    if (keyboard.isPressed("KeyQ")) movement[1] -= 1;

    if (!isZeroVec3(movement)) {
      addVec3(this.position, scaleVec3(movement, this.speed));
    }
  }

  applyMouseDelta(dx: number, dy: number): void {
    this.rotation[0] += dx * this.sensitivity;
    this.rotation[1] += dy * this.sensitivity;
    normalizeRotation(this.rotation);
  }
}

// #endregion

// ================================================================
// #region Renderer

class Renderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private prog!: DrawProgram;
  private buffers!: BufferObjects;

  private mousePos: Vec2 = [0, 0];
  private vpSize: Vec2 = [0, 0];

  private camera = new Camera();
  private keyboard = new KeyboardState();

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Element "${canvasId}" is not a canvas.`);
    }
    this.canvas = canvas;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      throw new Error("WebGL is not supported in this browser.");
    }
    this.gl = gl;
  }

  async init(): Promise<void> {
    this.setupMouseListener();
    await this.createShaderProgram();
    this.createGeometryBuffers();
    this.configureGL();
    this.startUpdateLoop();

    window.addEventListener("resize", () => this.resize());
    this.resize();

    requestAnimationFrame((t) => this.render(t));
  }

  // ── Mouse ──────────────────────────────────────────────────────

  private setupMouseListener(): void {
    this.canvas.addEventListener("mousemove", (e: MouseEvent) => {
      const dx = this.mousePos[0] - e.clientX;
      const dy = this.mousePos[1] - e.clientY;
      this.camera.applyMouseDelta(dx, dy);
      this.mousePos = [e.clientX, e.clientY];
    });
  }

  // ── Shaders ────────────────────────────────────────────────────

  private compileShader(source: string, type: number): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader object.");

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
      gl.deleteShader(shader);
      throw new Error(`Shader compile error:\n${log}`);
    }
    return shader;
  }

  private async createShaderProgram(): Promise<void> {
    const gl = this.gl;

    const vert = this.compileShader(vertSrc, gl.VERTEX_SHADER);
    const frag = this.compileShader(fragSrc, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create WebGL program.");

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "Unknown link error";
      gl.deleteProgram(program);
      throw new Error(`Program link error:\n${log}`);
    }

    // Clean up detached shaders.
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    const getAttrib = (name: string): number => {
      const loc = gl.getAttribLocation(program, name);
      if (loc < 0) throw new Error(`Attribute "${name}" not found in shader.`);
      return loc;
    };

    const getUniform = (name: string): WebGLUniformLocation => {
      const loc = gl.getUniformLocation(program, name);
      if (!loc) throw new Error(`Uniform "${name}" not found in shader.`);
      return loc;
    };

    this.prog = Object.assign(program, {
      inPos:       getAttrib("inPos"),
      iCamPos:     getUniform("iCamPos"),
      iCamRot:     getUniform("iCamRot"),
      iTime:       getUniform("iTime"),
      iResolution: getUniform("iResolution"),
    }) as DrawProgram;

    gl.useProgram(this.prog);
  }

  // ── Geometry ───────────────────────────────────────────────────

  private createGeometryBuffers(): void {
    const gl = this.gl;

    const positions = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
    const indices   = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const posBuffer = gl.createBuffer();
    const inxBuffer = gl.createBuffer();
    if (!posBuffer || !inxBuffer) throw new Error("Failed to create GPU buffers.");

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, inxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this.prog.inPos);
    gl.vertexAttribPointer(this.prog.inPos, 2, gl.FLOAT, false, 0, 0);

    this.buffers = {
      pos: posBuffer,
      inx: Object.assign(inxBuffer, { len: indices.length }),
    };
  }

  // ── GL Config ──────────────────────────────────────────────────

  private configureGL(): void {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 1);
  }

  // ── Resize ─────────────────────────────────────────────────────

  private resize(): void {
    this.vpSize = [window.innerWidth, window.innerHeight];
    this.canvas.width  = this.vpSize[0];
    this.canvas.height = this.vpSize[1];
  }

  // ── Camera Update Loop ─────────────────────────────────────────

  private startUpdateLoop(): void {
    setInterval(() => this.camera.update(this.keyboard), 10);
  }

  // ── Render Loop ────────────────────────────────────────────────

  private render(deltaMS: number): void {
    if (document.visibilityState === "visible") {
      const { gl, canvas, prog, buffers, camera, mousePos } = this;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const camRotRad = cloneVec3(camera.rotation);
      scaleVec3(camRotRad, DEG_TO_RAD);

      gl.uniform3f(prog.iCamPos,     camera.position[0], camera.position[1], camera.position[2]);
      gl.uniform3f(prog.iCamRot,     camRotRad[0],       camRotRad[1],       camRotRad[2]);
      gl.uniform1f(prog.iTime,       deltaMS / 1000);
      gl.uniform2f(prog.iResolution, canvas.width,       canvas.height);

      gl.drawElements(gl.TRIANGLES, buffers.inx.len, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame((t) => this.render(t));
  }
}

// #endregion

// ================================================================
// #region Entry Point

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const renderer = new Renderer("ogl-canvas");
    await renderer.init();
  } catch (err) {
    console.error("Renderer failed to initialize:", err);
    // Surface the error visibly during development.
    const msg = err instanceof Error ? err.message : String(err);
    document.body.innerHTML = `<pre style="color:red;padding:1rem">${msg}</pre>`;
  }
});

// #endregion