{
  description = "Universal static file server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.python3
          ];

          shellHook = ''
            echo "Serving current directory at http://localhost:8000"
            python3 -m http.server 8000
          '';
        };

        apps.default = {
          type = "app";
          program = toString (pkgs.writeShellScript "serve" ''
            echo "Serving current directory at http://localhost:8000"
            ${pkgs.python3}/bin/python3 -m http.server 8000
          '');
        };
      });
}