export class Vector2 {
    x: number;
    y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    // Static helpers

    static zero(): Vector2 {
        return new Vector2(0, 0);
    }

    static one(): Vector2 {
        return new Vector2(1, 1);
    }

    static up(): Vector2 {
        return new Vector2(0, 1);
    }

    static down(): Vector2 {
        return new Vector2(0, -1);
    }

    static left(): Vector2 {
        return new Vector2(-1, 0);
    }

    static right(): Vector2 {
        return new Vector2(1, 0);
    }

    // Clone

    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    // Basic operations

    add(v: Vector2): Vector2 {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    addSelf(v: Vector2): Vector2 {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v: Vector2): Vector2 {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    subSelf(v: Vector2): Vector2 {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    scale(s: number): Vector2 {
        return new Vector2(this.x * s, this.y * s);
    }

    scaleSelf(s: number): Vector2 {
        this.x *= s;
        this.y *= s;
        return this;
    }

    multiply(v: Vector2): Vector2 {
        return new Vector2(this.x * v.x, this.y * v.y);
    }

    divide(v: Vector2): Vector2 {
        return new Vector2(this.x / v.x, this.y / v.y);
    }

    // Math

    dot(v: Vector2): number {
        return this.x * v.x + this.y * v.y;
    }

    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    distance(v: Vector2): number {
        return Math.sqrt(this.distanceSquared(v));
    }

    distanceSquared(v: Vector2): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    normalize(): Vector2 {
        const len = this.length();

        if (len === 0) {
            return Vector2.zero();
        }

        return new Vector2(this.x / len, this.y / len);
    }

    normalizeSelf(): Vector2 {
        const len = this.length();

        if (len !== 0) {
            this.x /= len;
            this.y /= len;
        }

        return this;
    }

    // Utility

    floor(): Vector2 {
        return new Vector2(
            Math.floor(this.x),
            Math.floor(this.y)
        );
    }

    round(): Vector2 {
        return new Vector2(
            Math.round(this.x),
            Math.round(this.y)
        );
    }

    abs(): Vector2 {
        return new Vector2(
            Math.abs(this.x),
            Math.abs(this.y)
        );
    }

    isZero(): boolean {
        return this.x === 0 && this.y === 0;
    }

    equals(v: Vector2): boolean {
        return this.x === v.x && this.y === v.y;
    }

    set(x: number, y: number): Vector2 {
        this.x = x;
        this.y = y;
        return this;
    }

    toArray(): number[] {
        return [this.x, this.y];
    }

    toString(): string {
        return `Vector2(${this.x}, ${this.y})`;
    }
}