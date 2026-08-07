"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAnalysisDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_analysis_dto_1 = require("./create-analysis.dto");
class UpdateAnalysisDto extends (0, swagger_1.PartialType)(create_analysis_dto_1.CreateAnalysisDto) {
}
exports.UpdateAnalysisDto = UpdateAnalysisDto;
//# sourceMappingURL=update-analysis.dto.js.map