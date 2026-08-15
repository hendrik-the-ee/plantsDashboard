import { z, flattenError } from 'zod';
import { HttpError } from './errors.js';

export const SOIL_TYPES = [
  'potting_mix',
  'loam',
  'sandy',
  'clay',
  'coco_coir',
  'raised_bed',
  'hydroponic',
  'other',
];

export const LIGHT_LEVELS = ['low', 'medium', 'bright', 'full_sun'];

function blankToUndefined(value) {
  if (value === '' || value === null) return undefined;
  return value;
}

function blankToNull(value) {
  if (value === undefined) return undefined;
  if (value === '') return null;
  return value;
}

// Union so omitted PATCH fields stay undefined instead of being coerced to NaN.
const optionalText = z.preprocess(blankToNull, z.union([z.null(), z.string().trim().min(1)]).optional());
const optionalDate = z.preprocess(blankToNull, z.union([z.null(), z.iso.date()]).optional());
const optionalSoil = z.preprocess(blankToNull, z.union([z.null(), z.enum(SOIL_TYPES)]).optional());
const optionalLight = z.preprocess(blankToNull, z.union([z.null(), z.enum(LIGHT_LEVELS)]).optional());
const optionalPositiveInt = z.preprocess(
  blankToNull,
  z.union([z.null(), z.coerce.number().int().positive()]).optional(),
);
const optionalPositiveNumber = z.preprocess(
  blankToNull,
  z.union([z.null(), z.coerce.number().positive()]).optional(),
);
const optionalLatitude = z.preprocess(
  blankToNull,
  z.union([z.null(), z.coerce.number().gte(-90).lte(90)]).optional(),
);
const optionalLongitude = z.preprocess(
  blankToNull,
  z.union([z.null(), z.coerce.number().gte(-180).lte(180)]).optional(),
);

function coordinatesPair(value, ctx) {
  const lat = value.latitude;
  const lon = value.longitude;
  const latMissing = lat === undefined;
  const lonMissing = lon === undefined;
  if (latMissing && lonMissing) return;
  if (latMissing || lonMissing || (lat === null) !== (lon === null)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Latitude and longitude must both be set or both be empty',
      path: ['longitude'],
    });
  }
}

const plantFields = {
  species: optionalText,
  latitude: optionalLatitude,
  longitude: optionalLongitude,
  acquired_on: optionalDate,
  planted_on: optionalDate,
  days_to_maturity: optionalPositiveInt,
  fertilize_interval_days: optionalPositiveInt,
  container_size_liters: optionalPositiveNumber,
  soil_type: optionalSoil,
  light_level: optionalLight,
  notes: optionalText,
};

export const plantCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    ...plantFields,
    is_edible: z.boolean().optional().default(false),
    watering_interval_days: z.preprocess(
      (value) => (value === '' || value === undefined || value === null ? 7 : value),
      z.coerce.number().int().positive(),
    ),
  })
  .superRefine(coordinatesPair);

export const plantPatchSchema = z
  .object({
    name: z.preprocess(blankToUndefined, z.union([z.undefined(), z.string().trim().min(1)]).optional()),
    ...plantFields,
    is_edible: z.boolean().optional(),
    watering_interval_days: z.preprocess(
      blankToUndefined,
      z.union([z.undefined(), z.coerce.number().int().positive()]).optional(),
    ),
  })
  .superRefine(coordinatesPair)
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  });

const timeZones = new Set(Intl.supportedValuesOf('timeZone'));

export const settingsPatchSchema = z
  .object({
    timezone: z
      .string()
      .trim()
      .min(1)
      .refine((value) => timeZones.has(value), { message: 'Unknown IANA timezone' })
      .optional(),
    units: z.enum(['metric', 'imperial']).optional(),
  })
  .refine((value) => value.timezone !== undefined || value.units !== undefined, {
    message: 'At least one field is required',
  });

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new HttpError(400, 'Validation failed', flattenError(result.error)));
    }
    req.validated ??= {};
    req.validated[source] = result.data;
    next();
  };
}
