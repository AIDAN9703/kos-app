/**
 * The one elevation language for profile cards. A hairline plus a soft,
 * two-layer shadow lifts a card off the white page; interactive cards rise a
 * little more on hover. Use these instead of ad-hoc border/shadow classes so
 * every card in the section sits at the same depth.
 */
export const surface =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_14px_36px_-18px_rgba(15,23,42,0.28)]";

export const surfaceInteractive = `${surface} transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_22px_44px_-18px_rgba(15,23,42,0.34)]`;
