#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{vec, Env};

#[test]
fn test_full_poll_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, LivePoll);
    let client = LivePollClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);

    let question = String::from_str(&env, "Best Stellar wallet?");
    let options = vec![
        &env,
        String::from_str(&env, "Freighter"),
        String::from_str(&env, "Albedo"),
        String::from_str(&env, "xBull"),
    ];

    client.initialize(&admin, &question, &options);
    assert_eq!(client.get_question(), question);
    assert_eq!(client.get_votes(), vec![&env, 0u32, 0u32, 0u32]);

    client.vote(&voter1, &0);
    client.vote(&voter2, &0);

    assert_eq!(client.get_votes(), vec![&env, 2u32, 0u32, 0u32]);
    assert!(client.has_voted(&voter1));
    assert!(!client.has_voted(&Address::generate(&env)));
}

#[test]
#[should_panic(expected = "address has already voted")]
fn test_double_vote_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, LivePoll);
    let client = LivePollClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let voter = Address::generate(&env);
    let options = vec![
        &env,
        String::from_str(&env, "Yes"),
        String::from_str(&env, "No"),
    ];

    client.initialize(&admin, &String::from_str(&env, "Q?"), &options);
    client.vote(&voter, &0);
    client.vote(&voter, &1); // should panic
}
