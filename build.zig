const std = @import("std");

pub fn build(b: *std.Build) void {
    // WASM target for browser
    const wasm_target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    // Native target for tests
    const native_target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // ===================
    // Import hangul-wasm dependency
    // ===================
    const hangul_wasm_dep = b.dependency("hangul_wasm", .{});
    const hangul_module = hangul_wasm_dep.module("hangul");

    // ===================
    // WASM Library
    // ===================
    const wasm_module = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = wasm_target,
        .optimize = .ReleaseSmall,
        .imports = &.{
            .{ .name = "hangul", .module = hangul_module },
        },
    });

    const wasm = b.addExecutable(.{
        .name = "hangul-typing",
        .root_module = wasm_module,
    });
    wasm.entry = .disabled;
    wasm.rdynamic = true;

    const install_wasm = b.addInstallArtifact(wasm, .{
        .dest_dir = .{ .override = .{ .custom = "../www" } },
        .dest_sub_path = "hangul-typing.wasm",
    });

    const wasm_step = b.step("wasm", "Build WASM module");
    wasm_step.dependOn(&install_wasm.step);

    // ===================
    // Tests
    // ===================
    const test_module = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = native_target,
        .optimize = optimize,
        .imports = &.{
            .{ .name = "hangul", .module = hangul_module },
        },
    });

    const unit_tests = b.addTest(.{
        .root_module = test_module,
    });

    const run_unit_tests = b.addRunArtifact(unit_tests);
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_unit_tests.step);

    // ===================
    // Default: build WASM
    // ===================
    b.default_step.dependOn(&install_wasm.step);
}
