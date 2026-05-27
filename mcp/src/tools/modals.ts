/**
 * Modal tools — inspect, open, close.
 */
import type { ModalName } from "../context.js";
import type { UiTool } from "./index.js";

const MODAL_NAMES = [
  "hedge",
  "wrap-unwrap",
  "role-selector",
  "swap-history",
  "wallet-panel",
] as const satisfies readonly ModalName[];

const getActiveModal: UiTool = {
  name: "get_active_modal",
  description:
    "Return the name of the modal currently visible on screen, or null " +
    "if no modal is open.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (ctx) => {
    return { active: ctx.modals.getActive() };
  },
};

const openModal: UiTool = {
  name: "open_modal",
  description:
    "Open a named modal on the user's screen. Valid names: " +
    MODAL_NAMES.join(", ") +
    ". `props` is an optional object passed to the modal (e.g. " +
    "{ token: 'OKS' } for hedge/wrap-unwrap).",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        enum: [...MODAL_NAMES],
        description: "Which modal to open.",
      },
      props: {
        type: "object",
        description: "Modal-specific props.",
        additionalProperties: true,
      },
    },
    required: ["name"],
    additionalProperties: false,
  },
  handler: async (ctx, args) => {
    const name = args.name as ModalName;
    if (!MODAL_NAMES.includes(name)) {
      throw new Error(
        `open_modal: '${String(name)}' is not a known modal. Try one of: ${MODAL_NAMES.join(", ")}`,
      );
    }
    const props = (args.props as Record<string, unknown> | undefined) ?? undefined;
    ctx.modals.open(name, props);
    return { ok: true, active: ctx.modals.getActive() };
  },
};

const closeModal: UiTool = {
  name: "close_modal",
  description: "Close the modal currently visible on screen, if any.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  handler: async (ctx) => {
    ctx.modals.close();
    return { ok: true, active: ctx.modals.getActive() };
  },
};

export const modalsTools: UiTool[] = [getActiveModal, openModal, closeModal];
