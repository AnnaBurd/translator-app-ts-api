let lastSixMonthsList: Date[];
let dateOfUpdate: Date;

export const getLastSixMonths = () => {
  const currentDate = new Date();

  const hasAlreadyBeenUpdated =
    dateOfUpdate &&
    currentDate.getMonth() === dateOfUpdate.getMonth() &&
    currentDate.getFullYear() === dateOfUpdate.getFullYear();

  if (hasAlreadyBeenUpdated) return lastSixMonthsList;

  const baseMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  baseMonth.setMonth(baseMonth.getMonth() - 4);
  lastSixMonthsList = Array.from(
    { length: 6 },
    (_, i) => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + i, 1)
  );
  dateOfUpdate = currentDate;

  return lastSixMonthsList;
};

getLastSixMonths();
