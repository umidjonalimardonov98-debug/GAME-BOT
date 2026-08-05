import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { PlayerProvider } from "@/lib/player-context";
import { LangProvider } from "@/lib/lang-context";
import { ThemeProvider } from "@/lib/theme-context";
import Home from "@/pages/Home";
import AppleOfFortune from "@/pages/AppleOfFortune";
import Dice from "@/pages/Dice";
import Aviator from "@/pages/Aviator";
import Blackjack from "@/pages/Blackjack";
import Slots from "@/pages/Slots";
import Parity from "@/pages/Parity";
import Deposit from "@/pages/Deposit";
import Withdraw from "@/pages/Withdraw";
import HowToPlay from "@/pages/HowToPlay";
import Leaderboard from "@/pages/Leaderboard";
import Spin from "@/pages/Spin";
import Mines from "@/pages/Mines";
import Roulette from "@/pages/Roulette";
import History from "@/pages/History";
import Support from "@/pages/Support";
import Plinko from "@/pages/Plinko";
import Towers from "@/pages/Towers";
import Limbo from "@/pages/Limbo";
import Keno from "@/pages/Keno";
import HiLo from "@/pages/HiLo";
import CoinFlip from "@/pages/CoinFlip";
import Baccarat from "@/pages/Baccarat";
import CaseOpen from "@/pages/CaseOpen";
import Scratch from "@/pages/Scratch";
import DragonTiger from "@/pages/DragonTiger";
import RPS from "@/pages/RPS";
import Thimbles from "@/pages/Thimbles";
import LuckyCard from "@/pages/LuckyCard";
import GuessHand from "@/pages/GuessHand";
import FruitBlast from "@/pages/FruitBlast";
import Derby from "@/pages/Derby";
import MoneyWheel from "@/pages/MoneyWheel";
import NotFound from "@/pages/not-found";
import QuickGame from "@/pages/QuickGame";
import { NEW_GAMES } from "@/lib/new-games";
import RoundBreakdown from "@/components/casino/RoundBreakdown";
import GlobalWinFx from "@/components/casino/GlobalWinFx";
import LiveBg from "@/components/casino/LiveBg";
import { installGlobalClickSound } from "@/lib/sound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/apple" component={AppleOfFortune} />
      <Route path="/dice" component={Dice} />
      <Route path="/aviator" component={Aviator} />
      <Route path="/blackjack" component={Blackjack} />
      <Route path="/slots" component={Slots} />
      <Route path="/parity" component={Parity} />
      <Route path="/deposit" component={Deposit} />
      <Route path="/withdraw" component={Withdraw} />
      <Route path="/howtoplay" component={HowToPlay} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/spin" component={Spin} />
      <Route path="/mines" component={Mines} />
      <Route path="/roulette" component={Roulette} />
      <Route path="/history" component={History} />
      <Route path="/support" component={Support} />
      <Route path="/plinko" component={Plinko} />
      <Route path="/towers" component={Towers} />
      <Route path="/limbo" component={Limbo} />
      <Route path="/keno" component={Keno} />
      <Route path="/hilo" component={HiLo} />
      <Route path="/coinflip" component={CoinFlip} />
      <Route path="/baccarat" component={Baccarat} />
      <Route path="/case" component={CaseOpen} />
      <Route path="/scratch" component={Scratch} />
      <Route path="/dragontiger" component={DragonTiger} />
      <Route path="/rps" component={RPS} />
      <Route path="/thimbles" component={Thimbles} />
      <Route path="/luckycard" component={LuckyCard} />
      <Route path="/hands" component={GuessHand} />
      <Route path="/fruitblast" component={FruitBlast} />
      <Route path="/derby" component={Derby} />
      <Route path="/moneywheel" component={MoneyWheel} />
      {NEW_GAMES.map((g) => (
        <Route key={g.key} path={g.path}>{() => <QuickGame gameKey={g.key} />}</Route>
      ))}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => { installGlobalClickSound(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <ThemeProvider>
          <PlayerProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <LiveBg />
              <Router />
            </WouterRouter>
            <RoundBreakdown />
            <GlobalWinFx />
            <Toaster />
          </PlayerProvider>
        </ThemeProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
