import { getCities } from "@/lib/queries/cities";
import { getMakes, getModels } from "@/lib/queries/makes";
import type { City, Make, Model } from "@/lib/supabase/types";
import { citySeoSlug, makeSeoSlug, modelSeoSlug } from "./slugs";

export async function getSeoCatalog() {
  const [makesResult, modelsResult, citiesResult] = await Promise.all([getMakes(), getModels(), getCities()]);

  return {
    makes: makesResult.data,
    models: modelsResult.data,
    cities: citiesResult.data
  };
}

export function findMakeBySlug(makes: Make[], makeSlug: string) {
  return makes.find((make) => makeSeoSlug(make.make_name, make.make_slug) === makeSlug);
}

export function findModelBySlug(models: Model[], make: Make, modelSlug: string) {
  return models.find((model) => {
    const sameMake = model.make_id === make.make_id || model.make_name === make.make_name;
    return sameMake && modelSeoSlug(model.model_name, model.model_slug) === modelSlug;
  });
}

export function findCityBySlug(cities: City[], citySlug: string) {
  return cities.find((city) => citySeoSlug(city.city_name, city.city_slug) === citySlug);
}
