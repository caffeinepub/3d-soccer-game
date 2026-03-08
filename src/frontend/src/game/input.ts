export interface InputState {
  moveX: number; // -1 to 1 (left/right)
  moveZ: number; // -1 to 1 (forward/back in field)
  aimX: number; // -1 to 1 (arrow left/right — aim direction)
  aimY: number; // -1 to 1 (arrow up/down — aim height, +1 = up)
  shooting: boolean;
  powerBar: number; // 0 to 1
  isCharging: boolean;
  justReleased: boolean;
  switchPlayer: boolean;
  justSwitchedPlayer: boolean;
  pause: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private touchMoveX = 0;
  private touchMoveZ = 0;
  private touchShooting = false;
  private touchSwitch = false;

  state: InputState = {
    moveX: 0,
    moveZ: 0,
    aimX: 0,
    aimY: 0,
    shooting: false,
    powerBar: 0,
    isCharging: false,
    justReleased: false,
    switchPlayer: false,
    justSwitchedPlayer: false,
    pause: false,
  };

  private prevSpaceDown = false;
  private prevTabDown = false;
  private prevShootTouch = false;
  private prevSwitchTouch = false;

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown(e: KeyboardEvent) {
    // Prevent page scroll on arrow/space
    if (
      [
        "Space",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
      ].includes(e.code)
    ) {
      e.preventDefault();
    }
    this.keys.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  // Called from mobile controls
  setTouchMove(x: number, z: number) {
    this.touchMoveX = x;
    this.touchMoveZ = z;
  }

  setTouchShoot(val: boolean) {
    this.touchShooting = val;
  }

  setTouchSwitch(val: boolean) {
    this.touchSwitch = val;
  }

  update(dt: number) {
    const s = this.state;

    // Movement — WASD only (arrow keys are reserved for aiming)
    let mx = 0;
    let mz = 0;

    if (this.keys.has("KeyA")) mx -= 1;
    if (this.keys.has("KeyD")) mx += 1;
    if (this.keys.has("KeyW")) mz -= 1;
    if (this.keys.has("KeyS")) mz += 1;

    // Combine keyboard + touch
    if (Math.abs(this.touchMoveX) > 0.05 || Math.abs(this.touchMoveZ) > 0.05) {
      mx = this.touchMoveX;
      mz = this.touchMoveZ;
    }

    // Normalize diagonal movement
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    s.moveX = mx;
    s.moveZ = mz;

    // Aim direction — arrow keys only
    let ax = 0;
    let ay = 0;
    if (this.keys.has("ArrowLeft")) ax -= 1;
    if (this.keys.has("ArrowRight")) ax += 1;
    if (this.keys.has("ArrowUp")) ay += 1;
    if (this.keys.has("ArrowDown")) ay -= 1;
    s.aimX = ax;
    s.aimY = ay;

    // Power bar charging
    const spaceDown = this.keys.has("Space") || this.touchShooting;
    s.justReleased = false;

    if (spaceDown && !s.isCharging) {
      s.isCharging = true;
      s.powerBar = 0;
    }

    if (s.isCharging && spaceDown) {
      s.powerBar = Math.min(1, s.powerBar + dt * 1.5);
    }

    if (s.isCharging && !spaceDown && this.prevSpaceDown) {
      s.justReleased = true;
      s.isCharging = false;
    }

    if (!spaceDown && !s.isCharging) {
      // decay
      s.powerBar = Math.max(0, s.powerBar - dt * 3);
    }

    s.shooting = spaceDown;
    this.prevSpaceDown = spaceDown;

    // Player switch
    const tabDown = this.keys.has("Tab") || this.touchSwitch;
    s.justSwitchedPlayer = false;
    if (tabDown && !this.prevTabDown) {
      s.justSwitchedPlayer = true;
    }
    s.switchPlayer = tabDown;
    this.prevTabDown = tabDown;

    this.prevShootTouch = this.touchShooting;
    this.prevSwitchTouch = this.touchSwitch;
  }

  resetPowerBar() {
    this.state.powerBar = 0;
    this.state.isCharging = false;
    this.state.justReleased = false;
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
