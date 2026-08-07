"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateMeasurementDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateMeasurementDto {
    value;
    referenceDate;
    periodStart;
    periodEnd;
    source;
    notes;
}
exports.CreateMeasurementDto = CreateMeasurementDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 1590.5,
        description: 'Valor da medição (Decimal — não usar float para monetário).',
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Number)
], CreateMeasurementDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        type: String,
        format: 'date-time',
        example: '2026-08-07T00:00:00.000Z',
        description: 'Data de referência da medição. Única por indicador.',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "referenceDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: String,
        format: 'date-time',
        example: '2026-08-01T00:00:00.000Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "periodStart", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: String,
        format: 'date-time',
        example: '2026-08-31T23:59:59.000Z',
        description: 'periodEnd não pode ser anterior a periodStart.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.ValidateIf)((o) => !!o.periodStart && !!o.periodEnd),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "periodEnd", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'ERP',
        maxLength: 100,
        description: 'Origem do dado (ex: ERP, Planilha, Manual).',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Ajuste de estorno Q3',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateMeasurementDto.prototype, "notes", void 0);
//# sourceMappingURL=create-measurement.dto.js.map