"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateIndicatorDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_indicator_dto_1 = require("./create-indicator.dto");
class UpdateIndicatorDto extends (0, swagger_1.PartialType)(create_indicator_dto_1.CreateIndicatorDto) {
}
exports.UpdateIndicatorDto = UpdateIndicatorDto;
//# sourceMappingURL=update-indicator.dto.js.map