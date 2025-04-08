import { getTransmissionPrice } from "tarifs";
import { isAfter } from "date-fns";

type Power = 0 | 6 | 12;

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

  private cache: {
    upTemp?: number;
    downTemp?: number;
  } = {};

  constructor(
    public readonly timestamp: Date,
    public readonly price: number,
    private readonly elementProps: ElementProps,
    public readonly prevState: HourState,
  ) {
    this.increaseFactors = {
      6: {
        up:
          (elementProps.increasePerHour[6].up +
            elementProps.decreasePerHour.up) / 6,
        down:
          (elementProps.increasePerHour[6].down +
            elementProps.decreasePerHour.down) / 6,
      },
      12: {
        up:
          (elementProps.increasePerHour[12].up +
            elementProps.decreasePerHour.up) / 12,
        down:
          (elementProps.increasePerHour[12].down +
            elementProps.decreasePerHour.down) / 12,
      },
    };
    this.transmissionPrice = getTransmissionPrice(this.timestamp);
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
  selectedSetting?: HourlySetting,
): HourlySetting => {
  const selected = selectedSetting ?? currentSetting;
  if (
    currentSetting.temperatureUp >= maxTemp &&
    currentSetting.temperatureDown >= maxTemp
  ) {
    return selected;
  }
  const nextSelected =
    (currentSetting.power !== 12 &&
        currentSetting.totalPrice < selected.totalPrice)
      ? currentSetting
      : selected;

  return (isHourlySetting(currentSetting.prevState))
    ? getCheapestAvailableHour(currentSetting.prevState, maxTemp, nextSelected)
    : nextSelected;
};

export interface CalculateOptions {
  tempLimitUp: number;
  tempLimitDown: number;
  elementProps: ElementProps;
}

export const calculateSettings = (
  hourlySettings: HourlySetting[],
  options: CalculateOptions,
) => {
  for (const setting of hourlySettings) {
    while (
      setting.temperatureUp < options.tempLimitUp ||
      setting.temperatureDown < options.tempLimitDown
    ) {
      const cheapest = getCheapestAvailableHour(
        setting,
        options.elementProps.maxTemp,
      );
      if (cheapest.power !== 12) {
        cheapest.power = cheapest.power === 0 ? 6 : 12;
        hourlySettings.filter(({ timestamp }) =>
          isAfter(timestamp, cheapest.timestamp) &&
          !isAfter(timestamp, setting.timestamp)
        ).forEach((hs) => { hs.resetCache() });
      }
      if (cheapest === setting && cheapest.power === 12) {
        break;
      }
    }
  }

  return hourlySettings;
};
