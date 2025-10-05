export {};
declare global {
  // w przeglądarce ReturnType<typeof setInterval> == number,
  // a w środowisku Node może to być NodeJS.Timeout — ten alias ujednolica użycie
  type IntervalHandle = ReturnType<typeof setInterval>;
  type TimeoutHandle  = ReturnType<typeof setTimeout>;
}
