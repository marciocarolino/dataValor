"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = exports.nowIso = void 0;
const nowIso = () => new Date().toISOString();
exports.nowIso = nowIso;
const ok = (data) => ({
    success: true,
    data,
    timestamp: (0, exports.nowIso)(),
});
exports.ok = ok;
//# sourceMappingURL=api-response.js.map