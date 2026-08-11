{
  description = "Nix flake for the @parallel-web npm packages monorepo";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
      };

      # pnpm comes from corepack rather than nixpkgs, so the version always
      # matches package.json's "packageManager" field (and therefore CI and the
      # lockfile) instead of drifting with nixpkgs.
      pnpm = pkgs.writeShellScriptBin "pnpm" ''
        exec corepack pnpm "$@"
      '';
    in {
      devShells.default = pkgs.mkShell {
        # nodejs_24 ships corepack, which is what resolves and runs the exact
        # pnpm pinned by package.json's "packageManager" field.
        packages = with pkgs; [
          nodejs_24
          pnpm
          git
        ];

        env = {
          # corepack shims must never block on a y/n prompt when they download
          # the pinned package manager (CI, first shell entry, etc).
          COREPACK_ENABLE_DOWNLOAD_PROMPT = "0";
        };

        shellHook = ''
          echo "parallel-npm-packages dev shell"
          echo "node:     $(node --version 2>/dev/null)"
          echo "corepack: $(corepack --version 2>/dev/null)"
          echo "pnpm:     $(pnpm --version 2>/dev/null)"
          echo
          echo "Suggested setup:"
          echo "  pnpm install"
          echo "  pnpm build"
          echo "  pnpm test"
        '';
      };
    });
}
