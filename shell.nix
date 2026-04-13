{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  buildInputs = with pkgs; [
    git
    docker
    docker-compose
    biome
    openssl
    nodejs
    pnpm
    fnm
  ];

  shellHook = ''
    FNM_PATH="$HOME/.local/share/fnm"
    if [ -d "$FNM_PATH" ]; then
      export PATH="$FNM_PATH:$PATH"
      eval "`fnm env --use-on-cd --shell zsh`"
    fi
  '';
}
