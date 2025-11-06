export interface SanitizedModifier {
  field: string;
  type?: string;
  greaterThan?: number;
  lessThanOrEqual?: number;
  equals?: string;
  addFee?: number;
  addHours?: number;
}

export interface SanitizedAddOn {
  name: string;
  serviceCategory: string;
  description?: string;
  hiddenFromScheduler: boolean;
  baseCost: number;
  baseDurationHours: number;
  defaultInspectionEvents: string[];
  organizationServiceId?: string;
  modifiers: SanitizedModifier[];
  allowUpsell: boolean;
  orderIndex: number;
}

export interface SanitizedTax {
  name: string;
  addPercent: number;
  orderIndex: number;
}

export function sanitizeModifiers(input: unknown): SanitizedModifier[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce<SanitizedModifier[]>((acc, modifier) => {
    if (!modifier || typeof modifier !== 'object') {
      return acc;
    }

    const field = typeof (modifier as any).field === 'string' ? (modifier as any).field.trim() : undefined;
    if (!field) {
      return acc;
    }

    const entry: SanitizedModifier = { field };

    const typeValue = (modifier as any).type;
    if (typeof typeValue === 'string' && typeValue.trim() !== '') {
      entry.type = typeValue.trim();
    }

    const equalsValue = (modifier as any).equals;
    if (equalsValue !== undefined && equalsValue !== null && `${equalsValue}`.trim() !== '') {
      entry.equals = `${equalsValue}`.trim();
    }

    (['greaterThan', 'lessThanOrEqual', 'addFee', 'addHours'] as const).forEach((key) => {
      const raw = (modifier as any)[key];
      if (raw === undefined || raw === null || raw === '') {
        return;
      }

      const num = Number(raw);
      if (!Number.isNaN(num)) {
        entry[key] = num;
      }
    });

    acc.push(entry);
    return acc;
  }, []);
}


export function sanitizeAddOns(input: unknown): SanitizedAddOn[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce<SanitizedAddOn[]>((acc, item, index) => {
    if (!item || typeof item !== 'object') {
      return acc;
    }

    const name = typeof (item as any).name === 'string' ? (item as any).name.trim() : undefined;
    const serviceCategory = typeof (item as any).serviceCategory === 'string' ? (item as any).serviceCategory.trim() : undefined;

    if (!name || !serviceCategory) {
      return acc;
    }

    const toNumber = (value: any) => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = Number(value);
      return Number.isNaN(num) ? undefined : num;
    };

    const defaultEventsRaw = (item as any).defaultInspectionEvents;
    const defaultInspectionEvents = Array.isArray(defaultEventsRaw)
      ? defaultEventsRaw
          .map((event) => (typeof event === 'string' ? event.trim() : ''))
          .filter((event) => event.length > 0)
      : typeof defaultEventsRaw === 'string'
        ? defaultEventsRaw
            .split(',')
            .map((event) => event.trim())
            .filter((event) => event.length > 0)
        : [];

    acc.push({
      name,
      serviceCategory,
      description: typeof (item as any).description === 'string' ? (item as any).description.trim() || undefined : undefined,
      hiddenFromScheduler: Boolean((item as any).hiddenFromScheduler),
      baseCost: toNumber((item as any).baseCost) ?? 0,
      baseDurationHours: toNumber((item as any).baseDurationHours) ?? 0,
      defaultInspectionEvents,
      organizationServiceId:
        typeof (item as any).organizationServiceId === 'string'
          ? (item as any).organizationServiceId.trim() || undefined
          : undefined,
      modifiers: sanitizeModifiers((item as any).modifiers),
      allowUpsell: Boolean((item as any).allowUpsell),
      orderIndex: toNumber((item as any).orderIndex) ?? index,
    });

    return acc;
  }, []);
}

export function sanitizeTaxes(input: unknown): SanitizedTax[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce<SanitizedTax[]>((acc, item, index) => {
    if (!item || typeof item !== 'object') {
      return acc;
    }

    const name = typeof (item as any).name === 'string' ? (item as any).name.trim() : undefined;
    if (!name) {
      return acc;
    }

    const rawPercent = (item as any).addPercent;
    const numPercent = rawPercent === undefined || rawPercent === null || rawPercent === '' ? 0 : Number(rawPercent);

    acc.push({
      name,
      addPercent: Number.isNaN(numPercent) ? 0 : numPercent,
      orderIndex:
        (item as any).orderIndex === undefined || (item as any).orderIndex === null || (item as any).orderIndex === ''
          ? index
          : Number((item as any).orderIndex),
    });

    return acc;
  }, []);
}


