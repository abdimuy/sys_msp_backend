import chalk from "chalk";

const handleError = (error: string): void => {
  console.log(chalk.red('[Error]:' + error));
}

export default handleError;