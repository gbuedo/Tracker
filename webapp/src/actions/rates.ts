"use server";

import * as db from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Ratesheet, RateConcept } from "@/lib/types";

export async function saveRatesheetAction(
  name: string,
  client_name: string | null,
  markup_percent: number,
  rates: RateConcept[]
) {
  const data = await db.saveRatesheet(name, client_name, markup_percent, rates);
  revalidatePath("/ratesheet-tracker");
  revalidatePath("/");
  return data;
}

export async function updateRatesheetAction(id: number, fields: Partial<Ratesheet>) {
  const data = await db.updateRatesheet(id, fields);
  revalidatePath("/ratesheet-tracker");
  revalidatePath("/");
  return data;
}

export async function deleteRatesheetAction(id: number) {
  await db.deleteRatesheet(id);
  revalidatePath("/ratesheet-tracker");
  revalidatePath("/");
}

export async function duplicateRatesheetAction(
  sourceId: number,
  newName: string,
  clientName: string,
  initialMarkupPercent: number = 0,
  initialMarkupAmount: number = 0
) {
  const sheets = await db.getRatesheets();
  const source = sheets.find(s => s.id === sourceId);
  if (!source) throw new Error("Source ratesheet not found");

  // Copy rates and apply markup if specified
  const duplicatedRates = source.rates.map(r => {
    let rateStr = r.rate;
    const cleanRate = rateStr.trim().replace(/[^0-9.]/g, "");
    const numericRate = parseFloat(cleanRate);

    if (!isNaN(numericRate) && cleanRate.length > 0) {
      let finalRate = numericRate;
      
      // Apply percentage markup
      if (initialMarkupPercent !== 0) {
        finalRate = finalRate * (1 + initialMarkupPercent / 100);
      }
      // Apply fixed amount markup
      if (initialMarkupAmount !== 0) {
        finalRate = finalRate + initialMarkupAmount;
      }

      // Preserve decimal places if any
      const decimals = cleanRate.includes(".") ? cleanRate.split(".")[1].length : 0;
      const roundedRate = finalRate.toFixed(decimals > 2 ? decimals : 2);
      
      // Reassemble rate string preserving original units/symbols if possible
      // (For clean numbers, it just becomes the new number)
      rateStr = rateStr.replace(cleanRate, roundedRate);
    }
    
    return {
      ...r,
      rate: rateStr
    };
  });

  const data = await db.saveRatesheet(newName, clientName, initialMarkupPercent, duplicatedRates);
  revalidatePath("/ratesheet-tracker");
  revalidatePath("/");
  return data;
}

export async function applyMassMarkupAction(
  ratesheetId: number,
  markupType: 'percent' | 'fixed',
  value: number,
  categoryFilter: string | null = null // Category filter (null = all categories)
) {
  const sheets = await db.getRatesheets();
  const target = sheets.find(s => s.id === ratesheetId);
  if (!target) throw new Error("Ratesheet not found");

  const updatedRates = target.rates.map(r => {
    // If category filter is specified, only apply to that category
    if (categoryFilter && r.category !== categoryFilter) {
      return r;
    }

    let rateStr = r.rate;
    const cleanRate = rateStr.trim().replace(/[^0-9.]/g, "");
    const numericRate = parseFloat(cleanRate);

    if (!isNaN(numericRate) && cleanRate.length > 0) {
      let finalRate = numericRate;
      
      if (markupType === 'percent') {
        finalRate = finalRate * (1 + value / 100);
      } else {
        finalRate = finalRate + value;
      }

      const decimals = cleanRate.includes(".") ? cleanRate.split(".")[1].length : 0;
      const roundedRate = finalRate.toFixed(decimals > 2 ? decimals : 2);
      rateStr = rateStr.replace(cleanRate, roundedRate);
    }
    
    return {
      ...r,
      rate: rateStr
    };
  });

  const data = await db.updateRatesheet(ratesheetId, { rates: updatedRates });
  revalidatePath("/ratesheet-tracker");
  return data;
}
