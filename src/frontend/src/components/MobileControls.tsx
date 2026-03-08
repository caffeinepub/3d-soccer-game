import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InputManager } from "../game/input";

interface MobileControlsProps {
  inputManager: InputManager;
  showSwitchButton?: boolean;
}

export function MobileControls({
  inputManager,
  showSwitchButton = false,
}: MobileControlsProps) {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const joystickActiveRef = useRef(false);
  const joystickStartRef = useRef({ x: 0, y: 0 });
  const shootPressedRef = useRef(false);
  const [shootActive, setShootActive] = useState(false);

  const JOYSTICK_RADIUS = 50;

  const handleJoystickStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      joystickActiveRef.current = true;
      const touch = "touches" in e ? e.touches[0] : e;
      joystickStartRef.current = { x: touch.clientX, y: touch.clientY };
      e.preventDefault();
    },
    [],
  );

  const handleJoystickMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!joystickActiveRef.current) return;
      const touch =
        "touches" in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
      const dx = touch.clientX - joystickStartRef.current.x;
      const dy = touch.clientY - joystickStartRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamp = Math.min(dist, JOYSTICK_RADIUS);
      const angle = Math.atan2(dy, dx);
      const nx = (Math.cos(angle) * clamp) / JOYSTICK_RADIUS;
      const ny = (Math.sin(angle) * clamp) / JOYSTICK_RADIUS;

      if (thumbRef.current) {
        thumbRef.current.style.transform = `translate(${nx * JOYSTICK_RADIUS}px, ${ny * JOYSTICK_RADIUS}px)`;
      }

      inputManager.setTouchMove(nx, ny);
      e.preventDefault();
    },
    [inputManager],
  );

  const handleJoystickEnd = useCallback(() => {
    joystickActiveRef.current = false;
    if (thumbRef.current) {
      thumbRef.current.style.transform = "translate(0, 0)";
    }
    inputManager.setTouchMove(0, 0);
  }, [inputManager]);

  const handleShootStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      shootPressedRef.current = true;
      setShootActive(true);
      inputManager.setTouchShoot(true);
      e.preventDefault();
    },
    [inputManager],
  );

  const handleShootEnd = useCallback(() => {
    shootPressedRef.current = false;
    setShootActive(false);
    inputManager.setTouchShoot(false);
  }, [inputManager]);

  const handleSwitchPress = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      inputManager.setTouchSwitch(true);
      e.preventDefault();
      setTimeout(() => inputManager.setTouchSwitch(false), 150);
    },
    [inputManager],
  );

  useEffect(() => {
    window.addEventListener("touchmove", handleJoystickMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleJoystickEnd);
    window.addEventListener("mousemove", handleJoystickMove);
    window.addEventListener("mouseup", handleJoystickEnd);

    return () => {
      window.removeEventListener("touchmove", handleJoystickMove);
      window.removeEventListener("touchend", handleJoystickEnd);
      window.removeEventListener("mousemove", handleJoystickMove);
      window.removeEventListener("mouseup", handleJoystickEnd);
    };
  }, [handleJoystickMove, handleJoystickEnd]);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 15 }}
    >
      {/* Virtual joystick - bottom left */}
      <div
        className="absolute pointer-events-auto"
        style={{ bottom: 24, left: 24 }}
      >
        <div
          ref={joystickBaseRef}
          className="joystick-base rounded-full flex items-center justify-center touch-none"
          style={{ width: 120, height: 120 }}
          onTouchStart={handleJoystickStart}
          onMouseDown={handleJoystickStart}
          data-ocid="mobile.canvas_target"
        >
          <div
            ref={thumbRef}
            className="joystick-thumb rounded-full"
            style={{
              width: 48,
              height: 48,
              transform: "translate(0, 0)",
              transition: "transform 0.05s",
            }}
          />
        </div>
      </div>

      {/* Action buttons - bottom right */}
      <div
        className="absolute flex flex-col gap-3 pointer-events-auto"
        style={{ bottom: 24, right: 24 }}
      >
        {showSwitchButton && (
          <button
            type="button"
            className="rounded-full font-display font-bold text-xs uppercase tracking-wide pointer-events-auto touch-none transition-all active:scale-95"
            style={{
              width: 72,
              height: 72,
              background: "oklch(0.20 0.02 240 / 0.8)",
              border: "2px solid oklch(0.52 0.18 145 / 0.6)",
              color: "white",
              backdropFilter: "blur(4px)",
            }}
            onTouchStart={handleSwitchPress}
            onMouseDown={handleSwitchPress}
            data-ocid="mobile.secondary_button"
          >
            TAB
          </button>
        )}

        <button
          type="button"
          className="rounded-full font-display font-bold text-sm uppercase tracking-wide pointer-events-auto touch-none transition-all active:scale-95"
          style={{
            width: 88,
            height: 88,
            background: shootActive
              ? "oklch(0.60 0.24 25 / 0.9)"
              : "oklch(0.52 0.18 145 / 0.85)",
            border: `3px solid ${shootActive ? "oklch(0.60 0.24 25)" : "oklch(0.84 0.22 130)"}`,
            color: "white",
            backdropFilter: "blur(4px)",
            boxShadow: shootActive
              ? "0 0 20px oklch(0.60 0.24 25 / 0.5)"
              : "none",
          }}
          onTouchStart={handleShootStart}
          onMouseDown={handleShootStart}
          onTouchEnd={handleShootEnd}
          onMouseUp={handleShootEnd}
          data-ocid="mobile.primary_button"
        >
          {shootActive ? "⚡" : "SHOOT"}
        </button>
      </div>
    </div>
  );
}
