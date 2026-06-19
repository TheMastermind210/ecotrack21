use wasm_bindgen::prelude::*;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct ActivityData {
    pub category: String,
    pub quantity: f64,
}

#[wasm_bindgen]
pub fn carbon_calc(activity_json: &str) -> f64 {
    let activity: Result<ActivityData, _> = serde_json::from_str(activity_json);
    match activity {
        Ok(data) if data.quantity.is_finite() && data.quantity >= 0.0 => {
            // Deterministic arithmetic: apply emission factors independently in WASM
            // Emission factor sources:
            // - IPCC AR6 (transport)
            // - EPA (energy)
            // - DEFRA (food, goods)
            let factor = match data.category.as_str() {
                "transport" => 0.19, // e.g., kg CO2 per km
                "food" => 2.5,       // e.g., kg CO2 per meal
                "energy" => 0.4,     // e.g., kg CO2 per kWh
                "goods" => 15.0,     // e.g., kg CO2 per item
                _ => return -1.0,
            };
            data.quantity * factor
        },
        _ => -1.0,          // Signal invalid input
    }
}

#[cfg(test)]
mod tests {
    use super::carbon_calc;

    #[test]
    fn calculates_each_supported_category() {
        assert_eq!(carbon_calc(r#"{"category":"transport","quantity":10}"#), 1.9);
        assert_eq!(carbon_calc(r#"{"category":"food","quantity":2}"#), 5.0);
        assert_eq!(carbon_calc(r#"{"category":"energy","quantity":10}"#), 4.0);
        assert_eq!(carbon_calc(r#"{"category":"goods","quantity":2}"#), 30.0);
    }

    #[test]
    fn rejects_malformed_unknown_and_negative_inputs() {
        assert_eq!(carbon_calc("not-json"), -1.0);
        assert_eq!(carbon_calc(r#"{"category":"unknown","quantity":10}"#), -1.0);
        assert_eq!(carbon_calc(r#"{"category":"food","quantity":-1}"#), -1.0);
    }
}
