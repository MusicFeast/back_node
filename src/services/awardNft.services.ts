import { Request, Response } from "express";

const awardNft = async (req: Request, res: Response) => {
  try {
    res.send("Congratulations!!!");
  } catch (error) {
    throw new Error("error");
  }
};

export { awardNft };
