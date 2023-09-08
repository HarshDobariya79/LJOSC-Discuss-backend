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

module.exports = { formatDate };
