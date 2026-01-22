// Hangul Typing - WASM Entry Point
// A gamified typing trainer for learning Hangul

const std = @import("std");

// ===================
// WASM Exports
// ===================

/// Allocator for WASM memory management
var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

/// Allocate memory for JavaScript interop
export fn wasm_alloc(len: usize) ?[*]u8 {
    const slice = allocator.alloc(u8, len) catch return null;
    return slice.ptr;
}

/// Free memory allocated by wasm_alloc
export fn wasm_free(ptr: [*]u8, len: usize) void {
    allocator.free(ptr[0..len]);
}

// ===================
// Game State
// ===================

pub const GameState = enum(u8) {
    idle = 0,
    playing = 1,
    completed = 2,
    failed = 3,
};

var current_state: GameState = .idle;
var current_level: u8 = 1;
var current_score: u32 = 0;
var correct_count: u32 = 0;
var total_count: u32 = 0;

/// Get current game state
export fn wasm_get_state() u8 {
    return @intFromEnum(current_state);
}

/// Get current level
export fn wasm_get_level() u8 {
    return current_level;
}

/// Get current score
export fn wasm_get_score() u32 {
    return current_score;
}

/// Get accuracy as percentage (0-100)
export fn wasm_get_accuracy() u8 {
    if (total_count == 0) return 100;
    return @intCast((correct_count * 100) / total_count);
}

/// Start a level
export fn wasm_start_level(level: u8) bool {
    if (level < 1 or level > 9) return false;

    current_level = level;
    current_state = .playing;
    current_score = 0;
    correct_count = 0;
    total_count = 0;
    return true;
}

/// Submit input and check if correct
/// Returns: 1 = correct, 0 = incorrect
export fn wasm_submit_input(expected: u32, actual: u32) u8 {
    if (current_state != .playing) return 0;

    total_count += 1;

    if (expected == actual) {
        correct_count += 1;
        current_score += 10;
        return 1;
    }
    return 0;
}

/// Complete the current level
/// Returns accuracy percentage
export fn wasm_complete_level() u8 {
    const accuracy = wasm_get_accuracy();

    // Check if level is broken (passed)
    const threshold: u8 = switch (current_level) {
        1, 2, 3, 4 => 90,
        5, 6 => 85,
        7, 8 => 80,
        9 => 75,
        else => 90,
    };

    if (accuracy >= threshold) {
        current_state = .completed;
    } else {
        current_state = .failed;
    }

    return accuracy;
}

/// Reset game state
export fn wasm_reset() void {
    current_state = .idle;
    current_score = 0;
    correct_count = 0;
    total_count = 0;
}

// ===================
// Tests
// ===================

test "game state transitions" {
    wasm_reset();
    try std.testing.expectEqual(GameState.idle, current_state);

    const started = wasm_start_level(1);
    try std.testing.expect(started);
    try std.testing.expectEqual(GameState.playing, current_state);
    try std.testing.expectEqual(@as(u8, 1), current_level);
}

test "submit correct input increases score" {
    wasm_reset();
    _ = wasm_start_level(1);

    const result = wasm_submit_input(0xAC00, 0xAC00); // 가 == 가
    try std.testing.expectEqual(@as(u8, 1), result);
    try std.testing.expectEqual(@as(u32, 10), current_score);
    try std.testing.expectEqual(@as(u8, 100), wasm_get_accuracy());
}

test "submit incorrect input does not increase score" {
    wasm_reset();
    _ = wasm_start_level(1);

    const result = wasm_submit_input(0xAC00, 0xAC01); // 가 != 각
    try std.testing.expectEqual(@as(u8, 0), result);
    try std.testing.expectEqual(@as(u32, 0), current_score);
    try std.testing.expectEqual(@as(u8, 0), wasm_get_accuracy());
}

test "level completion with high accuracy" {
    wasm_reset();
    _ = wasm_start_level(1);

    // 10 correct inputs
    var i: u32 = 0;
    while (i < 10) : (i += 1) {
        _ = wasm_submit_input(0xAC00, 0xAC00);
    }

    const accuracy = wasm_complete_level();
    try std.testing.expectEqual(@as(u8, 100), accuracy);
    try std.testing.expectEqual(GameState.completed, current_state);
}

test "level completion with low accuracy fails" {
    wasm_reset();
    _ = wasm_start_level(1);

    // 5 correct, 5 incorrect = 50% accuracy
    var i: u32 = 0;
    while (i < 5) : (i += 1) {
        _ = wasm_submit_input(0xAC00, 0xAC00);
    }
    while (i < 10) : (i += 1) {
        _ = wasm_submit_input(0xAC00, 0xAC01);
    }

    const accuracy = wasm_complete_level();
    try std.testing.expectEqual(@as(u8, 50), accuracy);
    try std.testing.expectEqual(GameState.failed, current_state);
}

test "invalid level returns false" {
    wasm_reset();
    try std.testing.expect(!wasm_start_level(0));
    try std.testing.expect(!wasm_start_level(10));
}
