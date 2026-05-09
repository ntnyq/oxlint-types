// Extend this interface to patch or add rule option types.
//
// Example:
//
// Declare module '@oxlint-types/define-config' {
//   interface RuleOptionsPatch {
//     'react/self-closing-comp': { html?: boolean; component?: boolean }
//     'custom/my-rule': { enabled: boolean }
//   }
// }
//
// This file is never auto-generated, so your patches survive `pnpm rules:generate`.
// oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type
export interface RuleOptionsPatch {}
