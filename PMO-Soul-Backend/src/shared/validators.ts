import { registerDecorator, ValidationOptions } from 'class-validator';

const NUMERIC = /^-?\d+(\.\d+)?$/;

/** A finite number, or a string holding one — the wire form of BigInt and Decimal columns. */
export function IsNumeric(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNumeric',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value === 'number') return Number.isFinite(value);
          if (typeof value === 'bigint') return true;
          return typeof value === 'string' && NUMERIC.test(value.trim());
        },
        defaultMessage() {
          return propertyName + ' must be a number or a numeric string';
        },
      },
    });
  };
}
