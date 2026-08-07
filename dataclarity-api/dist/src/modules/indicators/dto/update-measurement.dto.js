"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMeasurementDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_measurement_dto_1 = require("./create-measurement.dto");
class UpdateMeasurementDto extends (0, swagger_1.PartialType)(create_measurement_dto_1.CreateMeasurementDto) {
}
exports.UpdateMeasurementDto = UpdateMeasurementDto;
//# sourceMappingURL=update-measurement.dto.js.map