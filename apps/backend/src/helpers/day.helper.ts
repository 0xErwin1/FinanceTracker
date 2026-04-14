import { MonthEnum } from '../enums';

const getMaxDayByMonth = (month: MonthEnum, year: number = new Date().getFullYear()): number => {
  switch (month) {
    case MonthEnum.APRIL:
    case MonthEnum.JUNE:
    case MonthEnum.SEPTEMBER:
    case MonthEnum.NOVEMBER:
      return 30;

    case MonthEnum.JANUARY:
    case MonthEnum.MARCH:
    case MonthEnum.MAY:
    case MonthEnum.JULY:
    case MonthEnum.AUGUST:
    case MonthEnum.OCTOBER:
    case MonthEnum.DECEMBER:
      return 31;

    case MonthEnum.FEBRUARY: {
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      return isLeapYear ? 29 : 28;
    }
  }
};

export const dayHelper = {
  getMaxDayByMonth,
};
