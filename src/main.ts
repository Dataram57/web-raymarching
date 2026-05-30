import { KeyboardState } from "./input/KeyboardState";
import { DEG_TO_RAD } from "./math";
import { Vector2 } from "./math/Vector2";
import { Vector3 } from "./math/Vector3";
import fragSrc from "./shaders/renderer.frag";
import vertSrc from "./shaders/renderer.vert";

// ================================================================
// #region Constants & Types

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
    position: Vector3 = new Vector3(1.5, 0.5, 1.5);
    rotation: Vector3 = Vector3.zero(); // degrees: [yaw, pitch, roll]
    forward: Vector3 = Vector3.zero();
    left: Vector3 = Vector3.zero();

    readonly speed = 0.1;
    readonly sensitivity = 0.5;

    update(keyboard: KeyboardState): void {
        const rotRad = this.rotation.clone();
        rotRad.scaleSelf(DEG_TO_RAD);

        this.forward = Vector3.getFPSForward(rotRad.y, rotRad.x);
        this.left = new Vector3(
            Math.cos(rotRad.x + Math.PI * 0.5),
            0,
            Math.sin(rotRad.x + Math.PI * 0.5),
        );

        const movement : Vector3 = new Vector3(0, 0, 0);

        if (keyboard.isPressed("KeyW")) movement.addSelf(this.forward);
        if (keyboard.isPressed("KeyS")) movement.subSelf(this.forward);
        if (keyboard.isPressed("KeyA")) movement.addSelf(this.left);
        if (keyboard.isPressed("KeyD")) movement.subSelf(this.left);
        if (keyboard.isPressed("KeyE")) movement.y += 1;
        if (keyboard.isPressed("KeyQ")) movement.y -= 1;

        if(!movement.isZero()){
            movement.scaleSelf(this.speed);
            this.position.addSelf(movement);
        }
    }

    applyMouseDelta(dx: number, dy: number): void {
        this.rotation.x += dx * this.sensitivity;
        this.rotation.y += dy * this.sensitivity;
        this.rotation.normalizeRotationSelf();
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

    private mousePos: Vector2 = Vector2.zero();
    private vpSize: Vector2 = Vector2.zero();

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
            const dx = this.mousePos.x - e.clientX;
            const dy = this.mousePos.y - e.clientY;
            this.camera.applyMouseDelta(dx, dy);
            this.mousePos = new Vector2(e.clientX, e.clientY);
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
        this.vpSize = new Vector2(window.innerWidth, window.innerHeight);
        this.canvas.width  = this.vpSize.x;
        this.canvas.height = this.vpSize.y;
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

            const camRotRad = camera.rotation.clone();
            camRotRad.scaleSelf(DEG_TO_RAD);

            gl.uniform3f(prog.iCamPos,     camera.position.x, camera.position.y, camera.position.z);
            gl.uniform3f(prog.iCamRot,     camRotRad.x,       camRotRad.y,       camRotRad.z);
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