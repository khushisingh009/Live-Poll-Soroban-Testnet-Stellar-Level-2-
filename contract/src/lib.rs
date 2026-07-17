#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

// ---------- Storage keys ----------
#[contracttype]
pub enum DataKey {
    Admin,
    Question,
    Options,          // Vec<String>
    Votes,             // Vec<u32>  (parallel to Options)
    HasVoted(Address), // bool -> stored implicitly by key presence
    Initialized,
}

const VOTED_EVENT: Symbol = symbol_short!("voted");
const RESET_EVENT: Symbol = symbol_short!("reset");

#[contract]
pub struct LivePoll;

#[contractimpl]
impl LivePoll {
    /// Initialize the poll. Can only be called once.
    pub fn initialize(env: Env, admin: Address, question: String, options: Vec<String>) {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }
        if options.len() < 2 {
            panic!("need at least 2 options");
        }

        let mut votes: Vec<u32> = Vec::new(&env);
        for _ in options.iter() {
            votes.push_back(0);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Options, &options);
        env.storage().instance().set(&DataKey::Votes, &votes);
        env.storage().instance().set(&DataKey::Initialized, &true);
    }

    /// Cast a vote for the option at `option_index`. One vote per address.
    pub fn vote(env: Env, voter: Address, option_index: u32) {
        voter.require_auth();

        if !env.storage().instance().has(&DataKey::Initialized) {
            panic!("poll not initialized");
        }

        let already_voted: bool = env
            .storage()
            .persistent()
            .get(&DataKey::HasVoted(voter.clone()))
            .unwrap_or(false);
        if already_voted {
            panic!("address has already voted");
        }

        let options: Vec<String> = env.storage().instance().get(&DataKey::Options).unwrap();
        if option_index >= options.len() {
            panic!("invalid option index");
        }

        let mut votes: Vec<u32> = env.storage().instance().get(&DataKey::Votes).unwrap();
        let current = votes.get(option_index).unwrap();
        votes.set(option_index, current + 1);
        env.storage().instance().set(&DataKey::Votes, &votes);

        env.storage()
            .persistent()
            .set(&DataKey::HasVoted(voter.clone()), &true);

        // Emit event for real-time frontend sync
        env.events()
            .publish((VOTED_EVENT, voter), (option_index, current + 1));
    }

    /// Reset the poll with a new question/options. Admin only.
    pub fn reset(env: Env, question: String, options: Vec<String>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if options.len() < 2 {
            panic!("need at least 2 options");
        }

        let mut votes: Vec<u32> = Vec::new(&env);
        for _ in options.iter() {
            votes.push_back(0);
        }

        env.storage().instance().set(&DataKey::Question, &question);
        env.storage().instance().set(&DataKey::Options, &options);
        env.storage().instance().set(&DataKey::Votes, &votes);

        env.events().publish((RESET_EVENT,), question);
    }

    pub fn get_question(env: Env) -> String {
        env.storage().instance().get(&DataKey::Question).unwrap()
    }

    pub fn get_options(env: Env) -> Vec<String> {
        env.storage().instance().get(&DataKey::Options).unwrap()
    }

    pub fn get_votes(env: Env) -> Vec<u32> {
        env.storage().instance().get(&DataKey::Votes).unwrap()
    }

    pub fn has_voted(env: Env, voter: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::HasVoted(voter))
            .unwrap_or(false)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

mod test;
