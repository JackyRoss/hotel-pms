"use client";

import { useActionState, useState } from "react";
import { createReservation, type FormState } from "@/lib/actions";

export interface RoomOption {
  id: number;
  label: string;
  rate: number;
  capacity: number;
}

export function NewReservationForm({
  rooms,
  channels,
  labels,
  defaults,
}: {
  rooms: RoomOption[];
  channels: { value: string; label: string }[];
  labels: Record<string, string>;
  defaults: { roomId: number; checkIn: string; checkOut: string };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createReservation, undefined);
  const [roomId, setRoomId] = useState(defaults.roomId || rooms[0]?.id);
  const room = rooms.find((r) => r.id === roomId);
  const [rate, setRate] = useState(room?.rate ?? 0);

  return (
    <form action={action} className="panel">
      {state?.error && <div className="error">{labels[state.error]}</div>}
      <div className="form">
        <label className="full">
          {labels.guest} *
          <input name="guest_name" required />
        </label>
        <label>
          {labels.phone}
          <input name="phone" type="tel" />
        </label>
        <label>
          {labels.email}
          <input name="email" type="email" />
        </label>
        <label>
          {labels.checkIn} *
          <input name="check_in" type="date" required defaultValue={defaults.checkIn} />
        </label>
        <label>
          {labels.checkOut} *
          <input name="check_out" type="date" required defaultValue={defaults.checkOut} />
        </label>
        <label>
          {labels.room} *
          <select
            name="room_id"
            value={roomId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setRoomId(id);
              setRate(rooms.find((r) => r.id === id)?.rate ?? 0);
            }}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {labels.adults}
          <input name="adults" type="number" min={1} max={room?.capacity ?? 4} defaultValue={1} />
        </label>
        <label>
          {labels.rate} (¥)
          <input name="rate" type="number" min={0} step={100} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </label>
        <label>
          {labels.channel}
          <select name="channel" defaultValue="direct">
            {channels.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          {labels.notes}
          <textarea name="notes" rows={2} />
        </label>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button type="submit" className="primary" disabled={pending}>
          {labels.save}
        </button>
      </div>
    </form>
  );
}
