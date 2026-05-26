export class Vector3 {
    constructor(
        public x: number = 0,
        public y: number = 0,
        public z: number = 0
    ) {}

    // ─── Factory helpers ───────────────────────────────────────────────────────

    static zero(): Vector3 { return new Vector3(0, 0, 0) }
    static one(): Vector3  { return new Vector3(1, 1, 1) }
    static up(): Vector3   { return new Vector3(0, 1, 0) }
    static right(): Vector3 { return new Vector3(1, 0, 0) }
    static forward(): Vector3 { return new Vector3(0, 0, 1) }

    static fromArray(arr: [number, number, number]): Vector3 {
        return new Vector3(arr[0], arr[1], arr[2])
    }

    static fromSpherical(r: number, theta: number, phi: number): Vector3 {
        return new Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
        )
    }

    // ─── Basic arithmetic (returns new Vector3) ────────────────────────────────

    add(v: Vector3): Vector3 {
        return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z)
    }

    sub(v: Vector3): Vector3 {
        return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z)
    }

    scale(s: number): Vector3 {
        return new Vector3(this.x * s, this.y * s, this.z * s)
    }

    negate(): Vector3 {
        return new Vector3(-this.x, -this.y, -this.z)
    }

    /** Component-wise multiply (Hadamard product) */
    mul(v: Vector3): Vector3 {
        return new Vector3(this.x * v.x, this.y * v.y, this.z * v.z)
    }

    // ─── In-place mutations (returns `this` for chaining) ─────────────────────

    addSelf(v: Vector3): this {
        this.x += v.x; this.y += v.y; this.z += v.z; return this
    }

    subSelf(v: Vector3): this {
        this.x -= v.x; this.y -= v.y; this.z -= v.z; return this
    }

    scaleSelf(s: number): this {
        this.x *= s; this.y *= s; this.z *= s; return this
    }

    // ─── Magnitude & direction ─────────────────────────────────────────────────

    lengthSq(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z
    }

    length(): number {
        return Math.sqrt(this.lengthSq())
    }

    normalize(): Vector3 {
        const len = this.length()
        if (len === 0)
            return Vector3.zero()
        return this.scale(1 / len)
    }

    normalizeSelf(): Vector3 {
        const len = this.length()
        if (len === 0){
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
        return this.scaleSelf(1 / len)
    }

    // ─── Dot & cross ──────────────────────────────────────────────────────────

    dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z
    }

    cross(v: Vector3): Vector3 {
        return new Vector3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        )
    }

    // ─── Distance ─────────────────────────────────────────────────────────────

    distanceTo(v: Vector3): number {
        return this.sub(v).length()
    }

    distanceSqTo(v: Vector3): number {
        return this.sub(v).lengthSq()
    }

    // ─── Interpolation ────────────────────────────────────────────────────────

    /** Linear interpolation — t is clamped to [0, 1] */
    lerp(v: Vector3, t: number): Vector3 {
        const tc = Math.max(0, Math.min(1, t))
        return new Vector3(
        this.x + (v.x - this.x) * tc,
        this.y + (v.y - this.y) * tc,
        this.z + (v.z - this.z) * tc
        )
    }

    /** Spherical linear interpolation (great for rotating directions) */
    slerp(v: Vector3, t: number): Vector3 {
        const tc = Math.max(0, Math.min(1, t))
        const dot = Math.max(-1, Math.min(1, this.normalize().dot(v.normalize())))
        const theta = Math.acos(dot) * tc
        const relative = v.sub(this.scale(dot)).normalize()
        return this.scale(Math.cos(theta)).add(relative.scale(Math.sin(theta)))
    }

    // ─── Projection & reflection ──────────────────────────────────────────────

    static getFPSForward(pitch: number, yaw: number) : Vector3{
        return new Vector3(
            Math.cos(pitch) * Math.cos(yaw),
            Math.sin(pitch),
            Math.cos(pitch) * Math.sin(yaw)
        );
    }

    /** Project this onto v */
    projectOnto(v: Vector3): Vector3 {
        const lenSq = v.lengthSq()
        if (lenSq === 0) return Vector3.zero()
        return v.scale(this.dot(v) / lenSq)
    }

    /** Reflect this off a surface with the given normal (must be normalized) */
    reflect(normal: Vector3): Vector3 {
        return this.sub(normal.scale(2 * this.dot(normal)))
    }

    // ─── Component utilities ──────────────────────────────────────────────────

    min(v: Vector3): Vector3 {
        return new Vector3(Math.min(this.x, v.x), Math.min(this.y, v.y), Math.min(this.z, v.z))
    }

    max(v: Vector3): Vector3 {
        return new Vector3(Math.max(this.x, v.x), Math.max(this.y, v.y), Math.max(this.z, v.z))
    }

    clamp(minV: Vector3, maxV: Vector3): Vector3 {
        return this.max(minV).min(maxV)
    }

    abs(): Vector3 {
        return new Vector3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z))
    }

    floor(): Vector3 {
        return new Vector3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))
    }

    ceil(): Vector3 {
        return new Vector3(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z))
    }

    round(): Vector3 {
        return new Vector3(Math.round(this.x), Math.round(this.y), Math.round(this.z))
    }

    // ─── Angle ────────────────────────────────────────────────────────────────

    /** Angle in radians between this and v */
    angleTo(v: Vector3): number {
        const d = this.normalize().dot(v.normalize())
        return Math.acos(Math.max(-1, Math.min(1, d)))
    }

    // ─── Comparison ───────────────────────────────────────────────────────────

    equals(v: Vector3, epsilon = 1e-10): boolean {
        return (
        Math.abs(this.x - v.x) <= epsilon &&
        Math.abs(this.y - v.y) <= epsilon &&
        Math.abs(this.z - v.z) <= epsilon
        )
    }

    isZero(epsilon = 1e-10): boolean {
        return this.lengthSq() <= epsilon * epsilon
    }

    // ─── Conversion ───────────────────────────────────────────────────────────

    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z)
    }

    toArray(): [number, number, number] {
        return [this.x, this.y, this.z]
    }

    toSpherical(): { r: number; theta: number; phi: number } {
        const r = this.length()
        if (r === 0) return { r: 0, theta: 0, phi: 0 }
        return {
        r,
        theta: Math.atan2(this.z, this.x),
        phi: Math.acos(this.y / r),
        }
    }

    toString(decimals = 2): string {
        const f = (n: number) => n.toFixed(decimals)
        return `Vector3(${f(this.x)}, ${f(this.y)}, ${f(this.z)})`
    }
}