import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, agents, machines, props, run, window, openOverlay, closeOverlay, setAgentOrder } from "herdr";

const C = {
  shell: "#d1d2d5", light: "#e5e6e8", edge: "#adb0b7", ink: "#30343c",
  muted: "#626773", graphite: "#343944", dark: "#252a33",
  white: "#f4f5f7", blue: "#2862ba", red: "#c8393e", yellow: "#efc748", green: "#238b4f",
};
const MONO = "Geist Mono";
const BUTTONS = [C.blue, C.red, C.yellow, C.green];
const STATUS = {
  working: { color: C.blue, ink: "#86b2ff", label: "WORKING" },
  blocked: { color: C.red, ink: "#ff9394", label: "NEEDS YOU" },
  done: { color: C.green, ink: "#81dfa4", label: "DONE" },
  idle: { color: C.yellow, ink: "#efcf6a", label: "STANDING BY" },
};
const state = (status) => STATUS[status] ?? { color: C.muted, ink: "#b7bcc7", label: "TERMINAL" };
const two = (n) => String(n).padStart(2, "0");
const upper = (s) => String(s ?? "").toUpperCase();
const stop = (_e, cx) => cx.stop_propagation();
const menu = (tab, target = {}) => openOverlay({
  mod: "menu", kind: "popup", width: 220, height: 300, props: { tab, target },
});
const newMenu = () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 });
const right = (action) => (_e, cx) => { cx.stop_propagation(); action(); };

function newSpace() {
  const remote = machines().filter((m) => m.name);
  if (!remote.length) return run("space.new", { machine: "" });
  openOverlay({
    mod: "snes", kind: "popup", width: 280, height: Math.min(440, 68 + (remote.length + 1) * 46),
    props: { part: "machines" },
  });
}

function pill(id, label, action) {
  return h_flex().id(id).h(27).px(13).flex_none().items_center().justify_center()
    .rounded(14).bg(C.graphite).border_b(2).border_color(C.dark)
    .font_family(MONO).text_size(10).font_bold().text_color(C.white).cursor_pointer()
    .hover((el) => el.bg(C.muted)).on_mouse_down("left", stop)
    .on_click((_e, cx) => { cx.stop_propagation(); action(); }).child(label);
}

function lamp(status, size = 8, onDark = false) {
  const s = state(status);
  return div().size(size).flex_none().rounded(size / 2).bg(onDark ? s.ink : s.color)
    .when(status === "blocked", (el) => el.loop("opacity", { from: 0.45, to: 1, period: 900 }));
}

// Adapted from Pixelherd by John Zetterman (2026), derived from Herdr 0.1.13's
// agents mod (Apache-2.0). Modified for SNES avatars only; see LICENSE.pixelherd.
function agentAvatar(a) {
  const animals = ["duck", "frog", "cat", "penguin"];
  let hash = 2166136261;
  for (let i = 0; i < a.address.length; i++) hash = Math.imul(hash ^ a.address.charCodeAt(i), 16777619);
  const animal = animals[(hash >>> 0) % animals.length];
  return div().id(`avatar-${a.address}`).relative().size(48).flex_none()
    .child(div().id(`avatar-${a.address}-body`).relative().size(48)
      .when(a.status === "working", (el) => el.loop("top", { from: 0, to: -3, period: 700 }))
      .child(image(`mods/snes/sprites/${animal}.svg`).size(48)))
    .when(a.status === "idle", (el) => el.child(div().absolute().top(-3).right(-3).w(12).h(13)
      .bg(C.graphite).border(1).border_color("#bac0cc").flex().items_center().justify_center()
      .font_family(MONO).text_size(10).text_color("#bac0cc").child("z")))
    .child(div().absolute().right(-2).bottom(-1).size(10).rounded(5).bg(C.graphite)
      .flex().items_center().justify_center().child(lamp(a.status, 6, true)));
}

function section(label, count, color) {
  return h_flex().h(32).flex_none().gap(8).items_center().font_family(MONO)
    .text_size(10).font_bold().text_color(C.muted)
    .child(div().w(3).h(12).rounded(1).bg(color))
    .child(div().flex_1().min_w(0).truncate().child(label)).child(two(count));
}

function controller() {
  const arrow = (direction, label, x, y, command, tip) => div().id(`dpad-${direction}`).absolute()
    .left(x).top(y).size(24).rounded(3).bg(C.graphite).border_b(2).border_color(C.dark)
    .flex().items_center().justify_center().text_color(C.light).font_family(MONO).text_size(13)
    .cursor_pointer().tooltip(tip).hover((el) => el.bg(C.muted))
    .on_click(() => run(command)).child(label);
  const face = (letter, color, x, y, tip, action) => div().id(`face-${letter}`).absolute()
    .left(x).top(y).size(28).rounded(14).bg(color).border_b(3).border_color(C.dark)
    .flex().items_center().justify_center().font_bold().text_size(12)
    .text_color(letter === "B" ? C.ink : C.white).cursor_pointer().tooltip(tip)
    .hover((el) => el.opacity(0.8)).on_click(action).child(letter);
  return v_flex().flex_none().p(12).gap(10).rounded(14).bg(C.light).border(1).border_color(C.edge)
    .child(h_flex().justify_between().font_family(MONO).text_size(9).font_bold().text_color(C.muted)
      .child("CONTROLLER").child("P1"))
    .child(h_flex().justify_between().items_center()
      .child(div().relative().w(72).h(72).flex_none()
        .child(arrow("up", "^", 24, 0, "space.prev", "Previous space"))
        .child(arrow("left", "<", 0, 24, "tab.prev", "Previous tab"))
        .child(div().id("dpad-center").absolute().left(24).top(24).size(24).bg(C.graphite)
          .flex().items_center().justify_center().cursor_pointer().tooltip("Zoom focused pane")
          .hover((el) => el.bg(C.muted)).on_click(() => run("pane.zoom"))
          .child(div().size(8).rounded(4).border(1).border_color(C.muted)))
        .child(arrow("right", ">", 48, 24, "tab.next", "Next tab"))
        .child(arrow("down", "v", 24, 48, "space.next", "Next space")))
      .child(div().relative().w(86).h(78).flex_none()
        .child(face("X", C.blue, 29, 0, "X: command palette", () => run("app.palette")))
        .child(face("A", C.red, 58, 25, "A: new terminal or agent", newMenu))
        .child(face("B", C.yellow, 29, 50, "B: next agent", () => run("agent.next")))
        .child(face("Y", C.green, 0, 25, "Y: new space", newSpace))))
    .child(v_flex().gap(2).font_family(MONO).text_size(9).text_color(C.muted)
      .child("L/R: TABS / U/D: SPACES").child("CENTER: ZOOM"));
}

export default class SuperHerdr extends View {
  init(initial, cx) {
    this.now = Date.now();
    if ((initial?.part ?? props()?.part) === "bottom") {
      cx.timer.every(15000, (cx) => { this.now = Date.now(); cx.notify(); });
    }
  }

  render() {
    const part = props()?.part ?? "side";
    if (part === "top") return this.top();
    if (part === "side") return this.side();
    if (part === "tabs") return this.tabs();
    if (part === "bottom") return this.bottom();
    if (part === "machines") return this.machinePicker();
    throw new Error(`Unknown SNES layout part: ${part}`);
  }

  top() {
    const space = spaces().find((s) => s.active);
    const w = window();
    const blocked = agents().some((a) => a.status === "blocked");
    const controls = [
      ["minimize", "win-min", "Minimize"],
      ["maximize", w?.maximized ? "win-restore" : "win-max", w?.maximized ? "Restore" : "Maximize"],
      ["close", "win-close", "Close window"],
    ];
    return v_flex().size_full().bg(C.shell).border_b(1).border_color(C.edge)
      .child(h_flex().flex_1().min_h(0).pl(w?.platform === "macos" ? 86 : 20).pr(10).gap(18).items_center()
        .on_mouse_down("right", right(() => menu("global")))
        .child(h_flex().w(218).flex_none().gap(12).items_center()
          .child(image("mods/snes/snes-logo.png").w(48).h(34).flex_none())
          .child(v_flex().gap(0)
            .child(div().font_family(MONO).text_size(10).font_bold().text_color(C.muted).child("SUPER"))
            .child(div().text_size(25).font_bold().text_color(C.ink).child("HERDR"))))
        .child(v_flex().flex_1().min_w(0).gap(3)
          .child(div().truncate().font_family(MONO).text_size(10).text_color(C.muted)
            .child(`PLAYER 01 / ${upper(space?.machine ?? "THIS MACHINE")}`))
          .child(div().truncate().text_size(18).font_semibold().text_color(C.ink).child(space?.name ?? "READY PLAYER ONE")))
        .child(v_flex().flex_none().gap(4).items_center()
          .child(h_flex().gap(5).items_center().child(lamp(blocked ? "blocked" : "done", 7))
            .child(div().font_family(MONO).text_size(9).text_color(C.muted).child("POWER"))))
        .child(pill("select", "SELECT", () => run("app.palette")).tooltip("Command palette"))
        .child(pill("start", "START", newMenu).tooltip("New terminal or agent"))
        .child(div().id("settings").size(28).flex_none().flex().items_center().justify_center()
          .text_color(C.muted).cursor_pointer().tooltip("Settings").hover((el) => el.text_color(C.ink))
          .on_mouse_down("left", stop).on_click(() => run("app.settings"))
          .child(svg("mods/workspace-chrome/settings.svg").size(16)))
        .when(w?.buttons, (el) => el.child(h_flex().flex_none().gap(1).items_center()
          .children(controls.map(([command, icon, tip]) => div().id(`window-${command}`)
            .w(30).h(28).flex_none().rounded(4).flex().items_center().justify_center()
            .text_color(C.ink).cursor_pointer().tooltip(tip)
            .hover((button) => button.bg(command === "close" ? C.red : C.light)
              .text_color(command === "close" ? C.white : C.ink))
            .on_mouse_down("left", stop)
            .on_click((_e, cx) => { cx.stop_propagation(); run(`window.${command}`); })
            .child(svg(`mods/tabs/${icon}.svg`).size(14)))))))
      .child(h_flex().h(4).flex_none().children(BUTTONS.map((color) => div().flex_1().h_full().bg(color))));
  }

  side() {
    const list = spaces();
    const crew = agents();
    setAgentOrder(crew.map((a) => a.address));
    const spaceRow = (s, i) => h_flex().id(`space-${s.id}`).h(44).flex_none().px(9).gap(9).rounded(7)
      .items_center().bg(s.active ? C.graphite : C.light).border(1).border_color(s.active ? C.graphite : C.edge)
      .cursor_pointer().hover((el) => el.bg(s.active ? C.dark : "#f1f2f4"))
      .on_click(() => run("space.select", { id: s.id }))
      .on_mouse_down("right", right(() => menu("space", { id: s.id })))
      .child(div().w(4).h(24).flex_none().rounded(2).bg(s.status === "blocked" ? C.red : BUTTONS[i % BUTTONS.length])
        .when(s.status === "blocked", (el) => el.loop("opacity", { from: 0.45, to: 1, period: 900 })))
      .child(div().font_family(MONO).text_size(10).text_color(s.active ? "#bac0cc" : C.muted).child(two(s.index)))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().truncate().text_size(12).font_semibold().text_color(s.active ? C.white : C.ink).child(s.name))
        .child(div().truncate().font_family(MONO).text_size(9).text_color(s.active ? "#bac0cc" : C.muted)
          .child(upper(s.machine ?? "LOCAL"))));
    const groups = new Map();
    list.forEach((s, i) => {
      const machine = s.machine ?? null;
      if (!groups.has(machine)) groups.set(machine, []);
      groups.get(machine).push(spaceRow(s, i));
    });
    const machineGroups = [...groups].sort(([left], [right]) => {
      if (left === right) return 0;
      if (left === null) return -1;
      if (right === null) return 1;
      return left.localeCompare(right);
    });
    const agentRow = (a) => {
      const s = state(a.status);
      return h_flex().id(`agent-${a.address}`).h(57).flex_none().px(9).gap(9).rounded(7)
        .items_center().bg(C.graphite).border(1).border_color(a.focused ? C.blue : C.graphite)
        .cursor_pointer().hover((el) => el.bg(C.dark)).on_click(() => run("agent.focus", { terminal: a.address }))
        .on_mouse_down("right", right(() => menu("pane", { pane: a.pane, terminal: a.address })))
        .child(agentAvatar(a))
        .child(v_flex().flex_1().min_w(0).gap(3)
          .child(div().truncate().text_size(11).font_semibold().text_color(C.white)
            .child(`${a.program?.name ?? a.app ?? "Agent"} / ${a.tab_name ?? ""}`))
          .child(div().truncate().font_family(MONO).text_size(9).text_color(s.ink)
            .child(`${s.label} / ${upper(a.space_name)}`)));
    };
    return v_flex().size_full().min_h(0).p(12).pt(4).gap(10).bg(C.shell)
      .on_mouse_down("right", right(() => menu("global")))
      .child(v_flex().id("snes-lists").flex_1().min_h(0).overflow_y_scrollbar()
        .child(section("WORLD SELECT", list.length, C.blue))
        .child(v_flex().flex_none().gap(6).children(machineGroups.map(([machine, rows]) =>
          v_flex().id(`space-machine-${machine === null ? "local" : `remote-${machine}`}`).flex_none()
            .child(section(upper(machine ?? "THIS MACHINE"), rows.length, C.edge).h(24).text_size(9)
              .tooltip(machine ?? "This machine"))
            .child(v_flex().flex_none().gap(6).children(rows)))))
        .child(div().h(8).flex_none())
        .child(pill("space-new", "+ NEW SPACE", newSpace))
        .child(div().h(8).flex_none())
        .child(section("PARTY", crew.length, C.green))
        .child(v_flex().flex_none().gap(6).children(crew.map(agentRow)))
        .when(!crew.length, (el) => el.child(div().py(8).text_size(11).text_color(C.muted).child("No agents connected."))))
      .child(controller());
  }

  tabs() {
    const space = spaces().find((s) => s.active);
    const tab = (t) => h_flex().id(`tab-${t.id}`).h_full().flex_none().px(12).gap(8)
      .rounded_tl(9).rounded_tr(9).bg(t.active ? C.graphite : C.light)
      .border_t(3).border_color(t.active ? C.blue : state(t.status).color)
      .items_center().font_family(MONO).text_size(11).text_color(t.active ? C.white : C.ink)
      .cursor_pointer().hover((el) => el.opacity(0.8))
      .on_click(() => run("tab.select", { id: t.id }))
      .on_mouse_down("right", right(() => menu("tab", { id: t.id, space: space.id })))
      .child(lamp(t.status, 6, t.active))
      .child(div().max_w(240).truncate().child(`${two(t.index)} ${t.name}`));
    return h_flex().id("snes-tabs").size_full().min_w(0).gap(6).items_center()
      .on_mouse_down("right", right(() => menu("global")))
      .child(h_flex().id("snes-tab-scroll").flex_1().min_w(0).h_full().gap(6).overflow_x_scrollbar()
        .children((space?.tabs ?? []).filter((t) => !t.settled).map(tab)))
      .child(pill("tab-new", "+", newMenu).tooltip("Insert a new terminal or agent"));
  }

  bottom() {
    const crew = agents();
    const states = ["working", "blocked", "done"];
    const count = (status) => crew.filter((a) => a.status === status).length;
    const clock = new Date(this.now).toTimeString().slice(0, 5);
    return h_flex().size_full().px(16).gap(18).items_center().bg(C.graphite)
      .font_family(MONO).text_size(10).text_color("#c1c6d0")
      .child(h_flex().flex_none().gap(3).children(Array.from({ length: 5 }, () => div().w(3).h(12).rounded(1).bg(C.dark))))
      .children(states.map((status) => h_flex().gap(6).flex_none().items_center()
        .child(lamp(status, 6, true)).child(`${two(count(status))} ${state(status).label}`)))
      .child(div().flex_1())
      .child(div().truncate().child(`16-BIT / ${two(machines().length)} MACHINES`))
      .child(div().id("footer-menu").cursor_pointer().tooltip("App menu")
        .hover((el) => el.text_color(C.white)).on_click(() => menu("global")).child("MENU"))
      .child(div().flex_none().text_color(C.white).child(clock));
  }

  machinePicker() {
    const all = [{ name: null, layout: "ready" }, ...machines().filter((m) => m.name)];
    return v_flex().size_full().min_h(0).p(10).gap(8).bg(C.shell).text_color(C.ink)
      .child(div().font_family(MONO).text_size(11).font_bold().child("SELECT YOUR MACHINE"))
      .child(v_flex().id("snes-machine-list").flex_1().min_h(0).gap(6).overflow_y_scrollbar()
        .children(all.map((m, i) => {
          const ready = m.layout === "ready";
          return h_flex().id(`machine-${m.name ?? "local"}`).h(40).flex_none().px(10).gap(8).rounded(6)
            .bg(C.light).items_center().text_size(12)
            .child(div().size(8).flex_none().rounded(4).bg(ready ? BUTTONS[i % BUTTONS.length] : C.edge))
            .child(div().flex_1().min_w(0).truncate().child(m.name ?? "This machine"))
            .when(!ready, (el) => el.child(div().text_size(10).text_color(C.muted).child(m.layout)))
            .when(ready, (el) => el.cursor_pointer().hover((row) => row.bg("#f1f2f4"))
              .on_click(() => {
                closeOverlay(props()?.overlay);
                run("space.new", { machine: m.name ?? "" });
              }));
        })));
  }
}
