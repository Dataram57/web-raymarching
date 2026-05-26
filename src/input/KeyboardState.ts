export class KeyboardState {
    private pressed = new Set<string>();

    constructor() {
        window.addEventListener("keydown", (e) => this.pressed.add(e.code));
        window.addEventListener("keyup", (e) => this.pressed.delete(e.code));
    }

    isPressed(code: string): boolean {
        return this.pressed.has(code);
    }
}