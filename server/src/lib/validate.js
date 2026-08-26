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

export const STARTED_AS = ['seed', 'seedling', 'cutting'];

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
const optionalStartedAs = z.preprocess(blankToNull, z.union([z.null(), z.enum(STARTED_AS)]).optional());
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
  top_area_cm2: optionalPositiveNumber,
  soil_type: optionalSoil,
  light_level: optionalLight,
  started_as: optionalStartedAs,
  notes: optionalText,
};

export const plantCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    ...plantFields,
    is_edible: z.boolean().optional().default(false),
    plant_count: z.preprocess(
      (value) => (value === '' || value === undefined || value === null ? 1 : value),
      z.coerce.number().int().positive(),
    ),
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
    plant_count: z.preprocess(
      blankToUndefined,
      z.union([z.undefined(), z.coerce.number().int().positive()]).optional(),
    ),
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
    latitude: optionalLatitude,
    longitude: optionalLongitude,
  })
  .superRefine(coordinatesPair)
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
  });

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const EVENT_TYPES = [
  'water',
  'fertilize',
  'prune',
  'repot',
  'harvest',
  'observation',
];

export const YIELD_UNITS = ['g', 'kg', 'oz', 'lb', 'count'];

const notFutureDate = z.coerce
  .date()
  .refine((value) => value.getTime() <= Date.now(), { message: 'occurred_at cannot be in the future' });

const optionalOccurredAt = z.preprocess(
  blankToUndefined,
  z.union([z.undefined(), notFutureDate]).optional(),
);

const eventNotes = z.preprocess(
  blankToNull,
  z.union([z.null(), z.string().trim().min(1)]).optional(),
);

const eventBase = {
  occurred_at: optionalOccurredAt,
  notes: eventNotes,
};

export const eventCreateSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('water'),
      amount_ml: z.coerce.number().positive(),
      ...eventBase,
    })
    .strict(),
  z
    .object({
      type: z.literal('harvest'),
      yield_amount: z.coerce.number().positive(),
      yield_unit: z.enum(YIELD_UNITS),
      ...eventBase,
    })
    .strict(),
  z
    .object({
      type: z.literal('repot'),
      container_size_liters: optionalPositiveNumber,
      soil_type: optionalSoil,
      ...eventBase,
    })
    .strict()
    .refine(
      (value) => value.container_size_liters != null || value.soil_type != null,
      { message: 'Repot requires container size and/or soil type' },
    ),
  z.object({ type: z.literal('fertilize'), ...eventBase }).strict(),
  z.object({ type: z.literal('prune'), ...eventBase }).strict(),
  z.object({ type: z.literal('observation'), ...eventBase }).strict(),
]);

export const waterSchema = z.object({
  amount_ml: z.preprocess(
    blankToUndefined,
    z.union([z.undefined(), z.coerce.number().positive()]).optional(),
  ),
  occurred_at: optionalOccurredAt,
});

export const eventPatchSchema = z
  .object({
    occurred_at: optionalOccurredAt,
    amount_ml: optionalPositiveNumber,
    yield_amount: optionalPositiveNumber,
    yield_unit: z.preprocess(blankToNull, z.union([z.null(), z.enum(YIELD_UNITS)]).optional()),
    notes: optionalText,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required',
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
