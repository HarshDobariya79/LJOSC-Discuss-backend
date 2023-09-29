// return date object to string as dd/mm/yyyy
const formatDate = (date) => {
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are zero-indexed, so add 1
  const year = date.getFullYear();

  // Create a string in the format "dd/mm/yyyy"
  const formattedDate = `${day < 10 ? "0" : ""}${day}/${
    month < 10 ? "0" : ""
  }${month}/${year}`;

  return formattedDate;
};

// return date object to string as dd/mm/yyyy - hh:mm
const formatDateTime = (date) => {
  if (!(date instanceof Date) || isNaN(date)) {
    return "Invalid Date";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  const formattedDate = `${day}/${month}/${year} - ${hours}:${minutes}`;

  return formattedDate;
};

module.exports = { formatDate, formatDateTime };
