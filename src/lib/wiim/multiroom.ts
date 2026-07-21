import "server-only";
import { wiimRequest, WiimError } from "./client";
import { Cmd } from "./constants";
import { fetchMultiroomSlaves } from "./commands";

async function send(ip: string, command: string, timeoutMs?: number): Promise<string> {
  const res = await wiimRequest(ip, command, { timeoutMs });
  if (res.status >= 400) {
    throw new WiimError(`Device returned HTTP ${res.status} for ${command}`, "HTTP_ERROR");
  }
  return res.text;
}

/** A setter succeeded if the device didn't explicitly reject the command. */
function assertAccepted(text: string, command: string): void {
  const t = text.trim().toLowerCase();
  if (t.includes("unknown command") || t.includes("not support")) {
    throw new WiimError(`Device does not support: ${command}`, "UNSUPPORTED");
  }
}

/**
 * Multiroom / group-sync commands. All command strings are needs-testing — no
 * test hardware; see docs/API-CAPABILITY-RESEARCH.md ("Multiroom / group sync").
 */

/**
 * Join a master group. Sent TO the follower device (which becomes a slave).
 * `masterIp` is the master device's LAN IP.
 */
export async function joinGroup(followerIp: string, masterIp: string): Promise<void> {
  const command = Cmd.multiroomJoin(masterIp); // needs testing
  const text = await send(followerIp, command);
  assertAccepted(text, command);
}

/**
 * Leave / disband the current group. Sent TO the device that should leave.
 * Tries the pywiim capital-U form first; if the device rejects it as
 * unsupported, retries once with the python-linkplay lowercase form.
 */
export async function leaveGroup(ip: string): Promise<void> {
  const primary = Cmd.multiroomUngroupNew; // needs testing
  const text = await send(ip, primary);
  const t = text.trim().toLowerCase();
  if (t.includes("unknown command") || t.includes("not support")) {
    const legacy = Cmd.multiroomUngroupLegacy; // needs testing
    const legacyText = await send(ip, legacy);
    assertAccepted(legacyText, legacy);
    return;
  }
  assertAccepted(text, primary);
}

/**
 * Kick a single slave from the group. Sent TO the master device.
 * `slaveIp` is the slave's LAN IP.
 */
export async function kickSlave(masterIp: string, slaveIp: string): Promise<void> {
  const command = Cmd.multiroomKick(slaveIp); // needs testing
  const text = await send(masterIp, command);
  assertAccepted(text, command);
}

/**
 * Set whole-group volume. Like group mute, the broadcast form
 * (`setPlayerCmd:slave_vol`) is confirmed accepted-but-no-op on real hardware
 * (wmrm 4.3) — tested with fixed-volume-output explicitly disabled, so that
 * setting isn't what's masking it. The per-slave targeted form
 * (`multiroom:SlaveVolume:<ip>:<n>`, still sent to the master) is confirmed
 * working, so this sets the master locally and every current slave
 * individually.
 */
export async function setGroupVolume(masterIp: string, volume: number): Promise<void> {
  const masterCommand = Cmd.volume(volume);
  const masterText = await send(masterIp, masterCommand);
  assertAccepted(masterText, masterCommand);

  const slaves = await fetchMultiroomSlaves(masterIp);
  await Promise.all(
    slaves.map(async (s) => {
      const command = Cmd.multiroomSlaveVolume(s.ip, volume);
      const text = await send(masterIp, command);
      assertAccepted(text, command);
    }),
  );
}

/**
 * Set whole-group mute. The broadcast form (`setPlayerCmd:slave_mute`) is
 * confirmed accepted-but-no-op on real hardware (wmrm 4.3) — it returns "OK"
 * but no device's mute state actually changes. The per-slave targeted form
 * (`multiroom:SlaveMute:<ip>:<0|1>`, still sent to the master) is confirmed
 * working, so this mutes the master locally and every current slave
 * individually.
 */
export async function setGroupMute(masterIp: string, muted: boolean): Promise<void> {
  const masterCommand = Cmd.mute(muted);
  const masterText = await send(masterIp, masterCommand);
  assertAccepted(masterText, masterCommand);

  const slaves = await fetchMultiroomSlaves(masterIp);
  await Promise.all(
    slaves.map(async (s) => {
      const command = Cmd.multiroomSlaveMute(s.ip, muted);
      const text = await send(masterIp, command);
      assertAccepted(text, command);
    }),
  );
}
