import { getTransmissionPrice } from "tarifs";
import { isAfter, isBefore } from "date-fns";
import { TZDate } from "@date-fns/tz";

type Power = 0 | 6 | 12;

const lowTempStartHour = 0;
const lowTempEndHour = 6;
const flexPriceLimit = 25;

const isLowTempHour = (date: Date) => {
  const tzDate = new TZDate(date, "Europe/Helsinki");
  return tzDate.getHours() >= lowTempStartHour &&
    tzDate.getHours() < lowTempEndHour;
};

export interface ElementProps {
  decreasePerHour: {
    up: number;
    down: number;
  };
  increasePerHour: {
    6: {
      up: number;
      down: number;
    };
    12: {
      up: number;
      down: number;
    };
  };
  maxTemp: number;
}

export interface HourState {
  temperatureUp: number;
  temperatureDown: number;
}

export class HourlySetting implements HourState {
  public readonly _tag = "HourlySetting";

  public readonly transmissionPrice: number;
  public readonly isLowTempHour: boolean;

  private increaseFactors: {
    6: {
      up: number;
      down: number;
    };
    12: {
      up: number;
      down: number;
    };
  };

  private _power: Power = 0;

  public flexPriceUsed = false;

  private cache: {
    upTemp?: number;
    downTemp?: number;
  } = {};

  constructor(
    public readonly timestamp: Date,
    public readonly price: number,
    private readonly elementProps: ElementProps,
    public readonly prevState: HourState,
    public readonly scheduledLimitUp?: number,
    public readonly scheduledLimitDown?: number,
    transmissionPrice?: number,
  ) {
    this.increaseFactors = {
      6: {
        up: (elementProps.increasePerHour[6].up +
          elementProps.decreasePerHour.up) / 6,
        down: (elementProps.increasePerHour[6].down +
          elementProps.decreasePerHour.down) / 6,
      },
      12: {
        up: (elementProps.increasePerHour[12].up +
          elementProps.decreasePerHour.up) / 12,
        down: (elementProps.increasePerHour[12].down +
          elementProps.decreasePerHour.down) / 12,
      },
    };
    this.transmissionPrice = transmissionPrice ?? 0;
    this.isLowTempHour = isLowTempHour(this.timestamp);
  }

  static async create(
    timestamp: Date,
    price: number,
    elementProps: ElementProps,
    prevState: HourState,
    scheduledLimits: { limitup: number | null; limitdown: number | null } = {
      limitup: null,
      limitdown: null,
    },
  ): Promise<HourlySetting> {
    const transmissionPrice = await getTransmissionPrice(timestamp);
    return new HourlySetting(
      timestamp,
      price,
      elementProps,
      prevState,
      scheduledLimits.limitup ?? undefined,
      scheduledLimits.limitdown ?? undefined,
      transmissionPrice,
    );
  }

  private calculateUpTemp() {
    const startTemp = this.prevState.temperatureUp;
    const increase = this._power !== 0
      ? this.increaseFactors[this._power].up * this.actualPower
      : 0;
    return startTemp - this.elementProps.decreasePerHour.up + increase;
  }

  private calculateDownTemp() {
    const startTemp = this.prevState.temperatureDown;
    const increase = this._power !== 0
      ? this.increaseFactors[this._power].down * this.actualPower
      : 0;
    return startTemp - this.elementProps.decreasePerHour.down + increase;
  }

  private setCache() {
    const downTemp = this.calculateDownTemp();
    const upTemp = Math.max(downTemp, this.calculateUpTemp());
    this.cache = {
      upTemp,
      downTemp,
    };
  }

  resetCache() {
    this.cache = {};
  }

  get power(): Power {
    return this._power;
  }

  set power(value: Power) {
    this.resetCache();
    this._power = value;
  }

  get totalPrice(): number {
    return this.price + this.transmissionPrice;
  }

  get resistor(): string {
    switch (this._power) {
      case 6:
        return "y";
      case 12:
        return "a";
      default:
        return "-";
    }
  }

  get actualPower(): number {
    switch (this._power) {
      case 6:
        return Math.min(
          6,
          (this.elementProps.maxTemp - this.prevState.temperatureUp +
            this.elementProps.decreasePerHour.up) / this.increaseFactors[6].up,
        );

      case 12:
        return Math.min(
          12,
          (this.elementProps.maxTemp - this.prevState.temperatureDown +
            this.elementProps.decreasePerHour.down) /
            this.increaseFactors[12].down,
        );

      default:
        return 0;
    }
  }

  get cost(): number {
    return this.totalPrice * this.actualPower;
  }

  get temperatureUp(): number {
    if (!this.cache.upTemp) {
      this.setCache();
    }

    return this.cache.upTemp!;
  }

  get temperatureDown(): number {
    if (!this.cache.downTemp) {
      this.setCache();
    }

    return this.cache.downTemp!;
  }

  toString() {
    return `${this.timestamp.toLocaleString("fi")} ${this.resistor} ${
      this.actualPower.toFixed(1)
    } ${this.price.toFixed(4)} ${this.temperatureDown.toFixed(2)} ${
      this.temperatureUp.toFixed(2)
    }`;
  }

  toJson() {
    return {
      timestamp: this.timestamp.toISOString(),
      power: this._power,
      actualPower: Math.round(this.actualPower * 10) / 10,
      price: this.price,
      transmissionPrice: this.transmissionPrice,
      totalPrice: this.totalPrice,
      cost: Math.round(this.cost * 1000) / 1000,
      tUp: Math.round(this.temperatureUp * 10) / 10,
      tDown: Math.round(this.temperatureDown * 10) / 10,
    };
  }
}

const isHourlySetting = (h: HourState): h is HourlySetting =>
  (h as HourlySetting)._tag === "HourlySetting";

const getCheapestAvailableHour = (
  currentSetting: HourlySetting,
  maxTemp: number,
  maxPower: Power,
  selectedSetting?: HourlySetting,
): HourlySetting => {
  const selected = selectedSetting ?? currentSetting;
  if (
    currentSetting.temperatureUp >= maxTemp &&
    currentSetting.temperatureDown >= maxTemp
  ) {
    return selected;
  }
  const nextSelected = (currentSetting.power < maxPower &&
      currentSetting.totalPrice < selected.totalPrice)
    ? currentSetting
    : selected;

  return (isHourlySetting(currentSetting.prevState))
    ? getCheapestAvailableHour(
      currentSetting.prevState,
      maxTemp,
      maxPower,
      nextSelected,
    )
    : nextSelected;
};

export interface CalculateOptions {
  tempLimitUp: number;
  tempLimitDown: number;
  elementProps: ElementProps;
  maxPower?: 6 | 12;
}

const comparePowerSettings = (
  a: HourlySetting,
  b: HourlySetting,
  settings: HourlySetting[],
) => {
  if (
    a.power !== 0 && a.power === b.power && a.actualPower < a.power &&
    b.actualPower < b.power
  ) {
    const fullPower = a.actualPower + b.actualPower;
    if (fullPower < b.power) {
      const plannedCost = a.cost + b.cost;
      const altCost = fullPower * b.totalPrice;
      if (altCost <= plannedCost) {
        a.power = a.power === 12 ? 6 : 0;
        settings.filter(({ timestamp }) => !isBefore(timestamp, a.timestamp))
          .forEach((hs) => {
            hs.resetCache();
          });
      }
    }
  }
};

export const calculateSettings = (
  hourlySettings: HourlySetting[],
  { tempLimitUp, tempLimitDown, elementProps, maxPower = 12 }: CalculateOptions,
) => {
  for (const setting of hourlySettings) {
    const limitUp = setting.scheduledLimitUp ?? (setting.isLowTempHour ? tempLimitUp - 5 : tempLimitUp);
    const limitDown = setting.scheduledLimitDown ?? tempLimitDown;
    const hasScheduledLimitUp = setting.scheduledLimitUp !== undefined;

    while (
      setting.temperatureUp < limitUp ||
      setting.temperatureDown < limitDown
    ) {
      const cheapest = getCheapestAvailableHour(
        setting,
        elementProps.maxTemp,
        maxPower,
      );

      if (
        !hasScheduledLimitUp &&
        cheapest.totalPrice > flexPriceLimit && !setting.isLowTempHour &&
        setting.temperatureUp >= (limitUp - 5)
      ) {
        setting.flexPriceUsed = true;
        break;
      }

      if (cheapest.power < maxPower) {
        cheapest.power = cheapest.power === 0 ? 6 : 12;
        hourlySettings.filter(({ timestamp }) =>
          isAfter(timestamp, cheapest.timestamp) &&
          !isAfter(timestamp, setting.timestamp)
        ).forEach((hs) => {
          hs.resetCache();
        });
      }
      if (cheapest === setting && cheapest.power === maxPower) {
        break;
      }
    }
  }

  for (let i = 0; i < hourlySettings.length - 1; i++) {
    comparePowerSettings(
      hourlySettings[i],
      hourlySettings[i + 1],
      hourlySettings,
    );
  }

  return hourlySettings;
};
